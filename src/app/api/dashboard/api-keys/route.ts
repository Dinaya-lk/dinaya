import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { requireApiBusiness } from "@/lib/api-auth";
import { API_KEY_SCOPES, generateApiKey } from "@/lib/api-keys";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withApiHandler } from "@/lib/api-handler";
import {
  VOICE_RECEPTIONIST_ROLLOUT,
  isVoiceReceptionistRolloutOpen,
  isVoiceScope,
} from "@/lib/voice-receptionist";
import { z } from "@/lib/validation";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).max(10).default(["bookings:read"]),
  keyType: z.enum(["generic", "desktop", "mobile"]).default("generic"),
  deviceId: z.string().trim().min(1).max(120).optional(),
  deviceName: z.string().trim().min(1).max(120).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireApiBusiness({ ownerOnly: true, req });
  if (!authResult.ok) return authResult.response;
  const { businessId } = authResult.context;

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyType: apiKeys.keyType,
      deviceId: apiKeys.deviceId,
      deviceName: apiKeys.deviceName,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.businessId, businessId))
    .orderBy(desc(apiKeys.createdAt));

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiBusiness({ ownerOnly: true, req });
  if (!authResult.ok) return authResult.response;
  const { businessId } = authResult.context;

  return withApiHandler(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the API key details." }, { status: 400 });
    }

    const needsVoiceScopes = parsed.data.scopes.some(isVoiceScope);
    const needsDesktopScopes = parsed.data.scopes.some(
      (scope) => scope === "desktop:read" || scope === "desktop:bookings" || scope === "desktop:write",
    );
    const needsMobileScopes = parsed.data.scopes.some(
      (scope) => scope === "mobile:read" || scope === "mobile:bookings" || scope === "mobile:write",
    );

    try {
      if (needsVoiceScopes) {
        if (!isVoiceReceptionistRolloutOpen()) {
          return NextResponse.json(
            { error: VOICE_RECEPTIONIST_ROLLOUT.message },
            { status: 503 },
          );
        }
        await requirePro(businessId, "aiVoiceReceptionist");
      } else if (needsDesktopScopes || needsMobileScopes) {
        await requirePro(businessId, "webhooks");
      } else {
        await requirePro(businessId, "webhooks");
      }
    } catch (error) {
      if (error instanceof PlanRequiredError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      throw error;
    }

    const { rawKey, keyHash } = generateApiKey();
    const [created] = await db
      .insert(apiKeys)
      .values({
        businessId,
        name: parsed.data.name,
        keyType: parsed.data.keyType,
        deviceId: parsed.data.deviceId ?? null,
        deviceName: parsed.data.deviceName ?? null,
        keyHash,
        scopes: parsed.data.scopes,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyType: apiKeys.keyType,
        deviceId: apiKeys.deviceId,
        deviceName: apiKeys.deviceName,
        scopes: apiKeys.scopes,
        createdAt: apiKeys.createdAt,
      });

    return NextResponse.json({ ...created, rawKey }, { status: 201 });
  }, "Unable to create API key.");
}
