import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, clients, type Broadcast } from "@/db/schema";
import { hasPublicTable, isMissingSchemaError } from "@/lib/dashboard/db-compat";
import { isoDateString, nullableIsoDateString } from "@/lib/dashboard/serialization";
import { sendMessage } from "@/lib/messaging";
import type { MessageChannel } from "@/lib/messaging/types";

export const BROADCAST_AUDIENCE_TYPES = ["all", "stage", "tags"] as const;
export type BroadcastAudienceType = (typeof BROADCAST_AUDIENCE_TYPES)[number];

export const BROADCAST_CHANNELS = ["email", "whatsapp", "sms"] as const;
export type BroadcastChannel = (typeof BROADCAST_CHANNELS)[number];

export const BROADCAST_STATUSES = ["draft", "sending", "sent", "failed"] as const;
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export const MAX_BROADCAST_RECIPIENTS = 200;

export type BroadcastAudienceFilter =
  | { stage: "lead" | "prospect" | "active" | "churned" }
  | { tags: string[] };

export type BroadcastSendStats = {
  recipientCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
};

type SerializableBroadcast = Omit<Broadcast, "updatedAt"> & {
  updatedAt?: Broadcast["updatedAt"] | null;
};

export function preferredChannelsForBroadcast(channel: BroadcastChannel): MessageChannel[] {
  switch (channel) {
    case "email":
      return ["email"];
    case "whatsapp":
      return ["whatsapp", "sms"];
    case "sms":
      return ["sms", "whatsapp"];
    default: {
      const _never: never = channel;
      throw new Error(`Unhandled broadcast channel: ${_never}`);
    }
  }
}

export async function resolveBroadcastRecipients(
  businessId: string,
  audienceType: BroadcastAudienceType,
  audienceFilter: BroadcastAudienceFilter | null,
) {
  const conditions = [
    eq(clients.businessId, businessId),
    eq(clients.communicationOptOut, false),
  ];

  if (audienceType === "stage" && audienceFilter && "stage" in audienceFilter) {
    conditions.push(eq(clients.stage, audienceFilter.stage));
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      tags: clients.tags,
    })
    .from(clients)
    .where(and(...conditions));

  if (audienceType === "tags" && audienceFilter && "tags" in audienceFilter) {
    const wanted = new Set(audienceFilter.tags.map((tag) => tag.toLowerCase()));
    return rows.filter((row) =>
      (row.tags ?? []).some((tag) => wanted.has(tag.toLowerCase())),
    );
  }

  return rows;
}

export async function sendBroadcast(
  broadcast: Broadcast,
): Promise<BroadcastSendStats> {
  const audienceFilter = broadcast.audienceFilter as BroadcastAudienceFilter | null;
  const recipients = await resolveBroadcastRecipients(
    broadcast.businessId,
    broadcast.audienceType as BroadcastAudienceType,
    audienceFilter,
  );

  const capped = recipients.slice(0, MAX_BROADCAST_RECIPIENTS);
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const channel = broadcast.channel as BroadcastChannel;
  const preferredChannels = preferredChannelsForBroadcast(channel);

  for (const recipient of capped) {
    const result = await sendMessage({
      businessId: broadcast.businessId,
      clientId: recipient.id,
      clientEmail: recipient.email,
      clientPhone: recipient.phone,
      feature: "broadcasts",
      idempotencyKey: `broadcast:${broadcast.id}:${recipient.id}`,
      subject: broadcast.subject ?? broadcast.name,
      body: broadcast.body,
      preferredChannels,
    });

    if (result.status === "sent") sentCount += 1;
    else if (result.status === "failed") failedCount += 1;
    else skippedCount += 1;
  }

  return {
    recipientCount: capped.length,
    sentCount,
    skippedCount,
    failedCount,
  };
}

export function serializeBroadcast(row: SerializableBroadcast) {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    audienceType: row.audienceType,
    audienceFilter: row.audienceFilter,
    status: row.status,
    recipientCount: Number(row.recipientCount ?? 0),
    sentCount: Number(row.sentCount ?? 0),
    skippedCount: Number(row.skippedCount ?? 0),
    failedCount: Number(row.failedCount ?? 0),
    sentAt: nullableIsoDateString(row.sentAt),
    createdAt: isoDateString(row.createdAt),
    updatedAt: isoDateString(row.updatedAt ?? row.createdAt),
  };
}

export async function countMatchingRecipients(
  businessId: string,
  audienceType: BroadcastAudienceType,
  audienceFilter: BroadcastAudienceFilter | null,
): Promise<number> {
  const recipients = await resolveBroadcastRecipients(businessId, audienceType, audienceFilter);
  return Math.min(recipients.length, MAX_BROADCAST_RECIPIENTS);
}

export async function listBroadcastsForBusiness(businessId: string) {
  if (!(await hasPublicTable("broadcasts"))) return [];

  try {
    return await db
      .select({
        audienceFilter: broadcasts.audienceFilter,
        audienceType: broadcasts.audienceType,
        body: broadcasts.body,
        businessId: broadcasts.businessId,
        channel: broadcasts.channel,
        createdAt: broadcasts.createdAt,
        failedCount: broadcasts.failedCount,
        id: broadcasts.id,
        name: broadcasts.name,
        recipientCount: broadcasts.recipientCount,
        sentAt: broadcasts.sentAt,
        sentCount: broadcasts.sentCount,
        skippedCount: broadcasts.skippedCount,
        status: broadcasts.status,
        subject: broadcasts.subject,
      })
      .from(broadcasts)
      .where(eq(broadcasts.businessId, businessId))
      .orderBy(desc(broadcasts.createdAt));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}
