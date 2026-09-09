import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, businesses } from "@/db/schema";
import { syncBusinessPrimaryLocation } from "@/lib/locations";
import { isPublicHttpsUrl, normalizePublicHttpsUrl } from "@/lib/public-url";
import { z } from "@/lib/validation";

export type DesktopSettingsData = Awaited<ReturnType<typeof getDesktopSettingsData>>;
export type DesktopSettingsBusinessPatch = z.infer<typeof desktopSettingsBusinessPatchSchema>;

const publicHttpsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .refine((value) => !value || isPublicHttpsUrl(value), {
    message: "URL must be a public HTTPS link.",
  });

export const desktopSettingsBusinessPatchSchema = z.object({
  address: z.string().trim().max(1000).optional().nullable(),
  bankTransferInstructions: z.string().trim().max(2000).optional().nullable(),
  businessType: z.string().trim().max(80).optional().nullable(),
  cancellationPolicy: z.string().trim().max(2000).optional().nullable(),
  depositPolicy: z.string().trim().max(2000).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  directoryListed: z.boolean().optional(),
  facebookUrl: publicHttpsUrlSchema,
  instagramUrl: publicHttpsUrlSchema,
  language: z.enum(["en", "si", "ta"]).optional(),
  name: z.string().trim().min(1, "Business name is required.").max(100).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  timezone: z.string().trim().min(1).max(80).optional(),
  websiteUrl: publicHttpsUrlSchema,
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one business setting is required.",
});

export const desktopSettingsPatchSchema = z.union([
  z.object({ revokeCurrentDevice: z.literal(true) }),
  z.object({ business: desktopSettingsBusinessPatchSchema }),
]);

const desktopBusinessSelect = {
  address: businesses.address,
  bankTransferInstructions: businesses.bankTransferInstructions,
  businessType: businesses.businessType,
  cancellationPolicy: businesses.cancellationPolicy,
  customDomain: businesses.customDomain,
  customDomainVerified: businesses.customDomainVerified,
  depositPolicy: businesses.depositPolicy,
  description: businesses.description,
  directoryListed: businesses.directoryListed,
  email: businesses.email,
  facebookUrl: businesses.facebookUrl,
  id: businesses.id,
  instagramUrl: businesses.instagramUrl,
  language: businesses.language,
  name: businesses.name,
  payhereEnabled: businesses.payhereEnabled,
  phone: businesses.phone,
  plan: businesses.plan,
  slug: businesses.slug,
  timezone: businesses.timezone,
  websiteUrl: businesses.websiteUrl,
};

export async function getDesktopSettingsData(businessId: string, currentKeyId: string) {
  const [business] = await db
    .select(desktopBusinessSelect)
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) return null;

  const devices = await db
    .select({
      createdAt: apiKeys.createdAt,
      deviceId: apiKeys.deviceId,
      deviceName: apiKeys.deviceName,
      expiresAt: apiKeys.expiresAt,
      id: apiKeys.id,
      lastUsedAt: apiKeys.lastUsedAt,
      name: apiKeys.name,
      revokedAt: apiKeys.revokedAt,
      scopes: apiKeys.scopes,
    })
    .from(apiKeys)
    // Include mobile device keys alongside desktop keys (Android fleet).
    .where(and(eq(apiKeys.businessId, businessId), inArray(apiKeys.keyType, ["desktop", "mobile"])))
    .orderBy(desc(apiKeys.createdAt))
    .limit(50);

  return {
    business,
    currentKeyId,
    devices: devices.map((device) => ({
      ...device,
      createdAt: device.createdAt.toISOString(),
      expiresAt: device.expiresAt?.toISOString() ?? null,
      isCurrent: device.id === currentKeyId,
      lastUsedAt: device.lastUsedAt?.toISOString() ?? null,
      revokedAt: device.revokedAt?.toISOString() ?? null,
    })),
    summary: {
      activeDevices: devices.filter((device) => !device.revokedAt).length,
      currentDeviceRevoked: Boolean(devices.find((device) => device.id === currentKeyId)?.revokedAt),
      revokedDevices: devices.filter((device) => device.revokedAt).length,
      totalDevices: devices.length,
    },
  };
}

export async function updateDesktopSettingsBusiness(
  businessId: string,
  patch: DesktopSettingsBusinessPatch,
) {
  const update = {
    ...(patch.address !== undefined && { address: patch.address || null }),
    ...(patch.bankTransferInstructions !== undefined && { bankTransferInstructions: patch.bankTransferInstructions || null }),
    ...(patch.businessType !== undefined && { businessType: patch.businessType || null }),
    ...(patch.cancellationPolicy !== undefined && { cancellationPolicy: patch.cancellationPolicy || null }),
    ...(patch.depositPolicy !== undefined && { depositPolicy: patch.depositPolicy || null }),
    ...(patch.description !== undefined && { description: patch.description || null }),
    ...(patch.directoryListed !== undefined && { directoryListed: patch.directoryListed }),
    ...(patch.facebookUrl !== undefined && { facebookUrl: normalizePublicHttpsUrl(patch.facebookUrl) }),
    ...(patch.instagramUrl !== undefined && { instagramUrl: normalizePublicHttpsUrl(patch.instagramUrl) }),
    ...(patch.language !== undefined && { language: patch.language }),
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.phone !== undefined && { phone: patch.phone || null }),
    ...(patch.timezone !== undefined && { timezone: patch.timezone }),
    ...(patch.websiteUrl !== undefined && { websiteUrl: normalizePublicHttpsUrl(patch.websiteUrl) }),
  };

  const [updated] = await db
    .update(businesses)
    .set(update)
    .where(eq(businesses.id, businessId))
    .returning(desktopBusinessSelect);

  if (!updated) return null;

  if (
    patch.name !== undefined ||
    patch.address !== undefined ||
    patch.phone !== undefined ||
    patch.timezone !== undefined
  ) {
    await syncBusinessPrimaryLocation(businessId, {
      address: updated.address,
      name: updated.name,
      phone: updated.phone,
      timezone: updated.timezone,
    });
  }

  return updated;
}

export async function revokeCurrentDesktopDevice(businessId: string, currentKeyId: string) {
  const [updated] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(apiKeys.id, currentKeyId),
      eq(apiKeys.businessId, businessId),
      inArray(apiKeys.keyType, ["desktop", "mobile"]),
    ))
    .returning({ id: apiKeys.id });

  return updated ?? null;
}
