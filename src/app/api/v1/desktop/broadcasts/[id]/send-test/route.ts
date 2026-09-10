import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import {
  BROADCAST_CHANNELS,
  preferredChannelsForBroadcast,
  type BroadcastChannel,
} from "@/lib/broadcasts";
import { sendMessage } from "@/lib/messaging";
import type { MessageChannel, ProviderSendResult } from "@/lib/messaging/types";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

const sendTestSchema = z.object({
  recipient: z.string().trim().max(200).optional(),
});

async function requireBroadcastAccess(businessId: string) {
  try {
    await requirePro(businessId, "broadcasts");
    return null;
  } catch (error) {
    if (error instanceof PlanRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }
}

function isBroadcastChannel(value: string): value is BroadcastChannel {
  return (BROADCAST_CHANNELS as readonly string[]).includes(value);
}

function parseTestRecipient(value: string | undefined): { email?: string; phone?: string } | null {
  const recipient = value?.trim() ?? "";
  if (!recipient) return null;

  if (recipient.includes("@")) {
    const email = z.email().safeParse(recipient);
    return email.success ? { email: email.data } : null;
  }

  const digits = recipient.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return { phone: normalizeSriLankanPhone(recipient) };
}

function preferredChannelsForTest(
  channel: BroadcastChannel,
  recipient: { email?: string; phone?: string },
): MessageChannel[] {
  const preferred = preferredChannelsForBroadcast(channel);
  if (recipient.email && !recipient.phone) {
    return preferred.includes("email") ? preferred : ["email"];
  }
  if (recipient.phone && !recipient.email) {
    const phoneChannels = preferred.filter((item) => item !== "email");
    return phoneChannels.length > 0 ? phoneChannels : ["sms", "whatsapp"];
  }
  return preferred;
}

function toTestSendStatus(status: ProviderSendResult["status"]): "queued" | "sent" | "failed" {
  switch (status) {
    case "sent":
      return "sent";
    case "failed":
      return "failed";
    case "skipped":
    case "duplicate":
      return "queued";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-broadcast-send-test",
    limit: 20,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const accessError = await requireBroadcastAccess(businessId);
  if (accessError) return accessError;

  const parsed = sendTestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid test send." }, { status: 400 });
  }

  const recipient = parseTestRecipient(parsed.data.recipient);
  if (!recipient) {
    return NextResponse.json(
      { error: "A valid phone number or email is required." },
      { status: 400 },
    );
  }

  const [broadcast] = await db
    .select()
    .from(broadcasts)
    .where(and(eq(broadcasts.id, id), eq(broadcasts.businessId, businessId)))
    .limit(1);

  if (!broadcast) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const channel = isBroadcastChannel(broadcast.channel) ? broadcast.channel : "sms";
  const result = await sendMessage({
    businessId,
    clientEmail: recipient.email ?? null,
    clientPhone: recipient.phone ?? null,
    feature: "broadcasts",
    idempotencyKey: `broadcast-test:${broadcast.id}:${recipient.email ?? recipient.phone}`,
    subject: broadcast.subject ?? broadcast.name,
    body: broadcast.body,
    preferredChannels: preferredChannelsForTest(channel, recipient),
  });

  return NextResponse.json({
    id: broadcast.id,
    status: toTestSendStatus(result.status),
    recipientCount: 1,
    channel: result.channel === "none" ? broadcast.channel : result.channel,
  });
}
