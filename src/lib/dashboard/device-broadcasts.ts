import { eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import {
  BROADCAST_AUDIENCE_TYPES,
  BROADCAST_CHANNELS,
  countMatchingRecipients,
  sendBroadcast,
  serializeBroadcast,
  type BroadcastAudienceFilter,
  type BroadcastAudienceType,
} from "@/lib/broadcasts";
import { z } from "@/lib/validation";

export type DeviceBroadcastPayload = ReturnType<typeof serializeBroadcast>;

export type CreateDeviceBroadcastResult =
  | { status: "created"; broadcast: DeviceBroadcastPayload }
  | {
      status: "invalid";
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

/** Device default is draft (`false`). Dashboard POST defaults `sendNow` to `true`. */
export const deviceBroadcastCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  channel: z.enum(BROADCAST_CHANNELS),
  subject: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().min(1).max(4000),
  audienceType: z.enum(BROADCAST_AUDIENCE_TYPES),
  audienceFilter: z
    .union([
      z.object({ stage: z.enum(["lead", "prospect", "active", "churned"]) }),
      z.object({ tags: z.array(z.string().trim().min(1).max(40)).min(1).max(20) }),
    ])
    .optional()
    .nullable(),
  sendNow: z.boolean().default(false),
});

function invalidAudienceMessage(
  audienceType: BroadcastAudienceType,
  audienceFilter: BroadcastAudienceFilter | null,
): string | null {
  switch (audienceType) {
    case "all":
      return null;
    case "stage":
      return audienceFilter && "stage" in audienceFilter
        ? null
        : "Choose a client stage for this broadcast.";
    case "tags":
      return audienceFilter && "tags" in audienceFilter
        ? null
        : "Add at least one tag for this broadcast.";
    default: {
      const _exhaustive: never = audienceType;
      return _exhaustive;
    }
  }
}

export async function createDeviceBroadcast(
  businessId: string,
  input: unknown,
): Promise<CreateDeviceBroadcastResult> {
  const parsed = deviceBroadcastCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      error: "Please check the broadcast details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const audienceFilter = (parsed.data.audienceFilter ?? null) as BroadcastAudienceFilter | null;
  const audienceError = invalidAudienceMessage(parsed.data.audienceType, audienceFilter);
  if (audienceError) {
    return { status: "invalid", error: audienceError };
  }

  const recipientPreview = await countMatchingRecipients(
    businessId,
    parsed.data.audienceType,
    audienceFilter,
  );

  if (recipientPreview === 0) {
    return {
      status: "invalid",
      error: "No eligible clients match this audience. Clients who opted out are excluded.",
    };
  }

  const now = new Date();
  const [created] = await db
    .insert(broadcasts)
    .values({
      businessId,
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject: parsed.data.subject?.trim() || null,
      body: parsed.data.body,
      audienceType: parsed.data.audienceType,
      audienceFilter,
      status: parsed.data.sendNow ? "sending" : "draft",
      recipientCount: recipientPreview,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    return { status: "invalid", error: "Could not create the broadcast." };
  }

  if (!parsed.data.sendNow) {
    return { status: "created", broadcast: serializeBroadcast(created) };
  }

  try {
    const stats = await sendBroadcast(created);
    const finalStatus = stats.sentCount > 0 ? "sent" : stats.failedCount > 0 ? "failed" : "sent";

    const [updated] = await db
      .update(broadcasts)
      .set({
        status: finalStatus,
        recipientCount: stats.recipientCount,
        sentCount: stats.sentCount,
        skippedCount: stats.skippedCount,
        failedCount: stats.failedCount,
        sentAt: now,
        updatedAt: now,
      })
      .where(eq(broadcasts.id, created.id))
      .returning();

    return { status: "created", broadcast: serializeBroadcast(updated ?? created) };
  } catch (error) {
    await db
      .update(broadcasts)
      .set({
        status: "failed",
        updatedAt: now,
      })
      .where(eq(broadcasts.id, created.id));

    throw error;
  }
}
