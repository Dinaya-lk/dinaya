import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, voiceIntegrations } from "@/db/schema";
import {
  VOICE_RECEPTIONIST_ROLLOUT,
  isVoiceReceptionistRolloutOpen,
} from "@/lib/voice-receptionist";
import { canUseFeature, resolveEffectivePlan } from "@/lib/plan";

/**
 * Twilio inbound voice webhook (Phase 2 foundation).
 * Configure a Twilio number voice URL to POST here with ?businessId=<uuid>.
 * Returns ConversationRelay TwiML when TWILIO_CONVERSATION_RELAY_WS_URL is set.
 */
export async function POST(req: NextRequest) {
  const formData = await readTwilioFormData(req);
  if (!verifyTwilioSignature(req, formData)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  if (!isVoiceReceptionistRolloutOpen()) {
    return twimlResponse(
      `<Response><Say language="en-IN">${escapeXml(VOICE_RECEPTIONIST_ROLLOUT.shortMessage)} Please book online for now.</Say></Response>`,
    );
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return twimlResponse("<Response><Say language=\"en-IN\">Service unavailable.</Say></Response>", 400);
  }

  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      plan: businesses.plan,
      planExpiresAt: businesses.planExpiresAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return twimlResponse("<Response><Say language=\"en-IN\">Business not found.</Say></Response>", 404);
  }

  // Plan gate: without aiVoiceReceptionist entitlement, do not disclose the
  // tenant's custom welcome message — return the generic fallback instead.
  const effectivePlan = resolveEffectivePlan({
    storedPlan: business.plan,
    planExpiresAt: business.planExpiresAt,
  });
  if (!canUseFeature(effectivePlan, "aiVoiceReceptionist")) {
    return twimlResponse(`<Response><Say language="en-IN">${escapeXml("Our AI receptionist is being configured. Please call back shortly or book online.")}</Say></Response>`);
  }

  const [integration] = await db
    .select({ welcomeMessage: voiceIntegrations.welcomeMessage, fallbackMessage: voiceIntegrations.fallbackMessage })
    .from(voiceIntegrations)
    .where(eq(voiceIntegrations.businessId, businessId))
    .limit(1);

  const relayWs = process.env.TWILIO_CONVERSATION_RELAY_WS_URL;
  if (relayWs) {
    const welcome = integration?.welcomeMessage ?? `Welcome to ${business.name}. How can I help you book today?`;
    const xml = [
      "<Response>",
      "<Connect>",
      `<ConversationRelay url="${escapeXml(relayWs)}" welcomeGreeting="${escapeXml(welcome)}" />`,
      "</Connect>",
      "</Response>",
    ].join("");
    return twimlResponse(xml);
  }

  const fallback = integration?.fallbackMessage
    ?? "Our AI receptionist is being configured. Please call back shortly or book online.";
  return twimlResponse(`<Response><Say language="en-IN">${escapeXml(fallback)}</Say></Response>`);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twimlResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  void req;
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

async function readTwilioFormData(req: NextRequest): Promise<FormData | null> {
  try {
    return await req.formData();
  } catch {
    return null;
  }
}

function verifyTwilioSignature(req: NextRequest, formData: FormData | null): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const providedSignature = req.headers.get("x-twilio-signature")?.trim();
  if (!authToken || !providedSignature || !formData) {
    return false;
  }

  const expectedSignature = createHmac("sha1", authToken)
    .update(buildTwilioSignaturePayload(req.url, formData), "utf8")
    .digest("base64");

  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  return (
    providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function buildTwilioSignaturePayload(url: string, formData: FormData): string {
  const groupedEntries = new Map<string, string[]>();

  for (const [key, value] of formData.entries()) {
    const normalizedValue = typeof value === "string" ? value : value.name;
    const values = groupedEntries.get(key) ?? [];
    values.push(normalizedValue);
    groupedEntries.set(key, values);
  }

  return [...groupedEntries.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce(
      (payload, [key, values]) => `${payload}${key}${values.sort().join("")}`,
      url,
    );
}
