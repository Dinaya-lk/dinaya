import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, validationError } from "@/lib/action-result";
import { requireApiBusiness } from "@/lib/api-auth";
import { collectRemovedBusinessImageUrls } from "@/lib/business-image-storage";
import { deleteBusinessImagesByPublicUrls } from "@/lib/supabase-storage";
import { logActivity } from "@/lib/activity-log";
import { encryptSecret } from "@/lib/secrets";
import { syncBusinessPrimaryLocation } from "@/lib/locations";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { isPublicHttpsUrl, normalizePublicHttpsUrl } from "@/lib/public-url";
import { bookingThemeFieldsSchema } from "@/lib/schemas/booking-theme";
import { z } from "@/lib/validation";

const publicHttpsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .refine((value) => !value || isPublicHttpsUrl(value), {
    message: "URL must be a public HTTPS link.",
  });

const publicImageUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .refine((value) => !value || isPublicHttpsUrl(value) || value.startsWith("/"), {
    message: "Image URL must be a public HTTPS link or a site path like /logo.png.",
  });

const logoUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .refine((value) => !value || isPublicHttpsUrl(value) || value.startsWith("/"), {
    message: "Logo must be a public HTTPS URL or a site path like /logo.png.",
  });

const galleryImageSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => isPublicHttpsUrl(value) || value.startsWith("/"), {
    message: "Gallery image must be a public HTTPS link or a site path.",
  });

const settingsSchema = z
  .object({
    name: z.string().trim().min(1, "Business name is required.").max(100).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    phone: z.string().trim().max(20).optional().nullable(),
    address: z.string().trim().max(1000).optional().nullable(),
    timezone: z.string().trim().min(1).max(80).optional(),
    language: z.enum(["en", "si", "ta"]).optional(),
    businessType: z.string().trim().max(80).optional().nullable(),
    cancellationPolicy: z.string().trim().max(2000).optional().nullable(),
    depositPolicy: z.string().trim().max(2000).optional().nullable(),
    bankTransferInstructions: z.string().trim().max(2000).optional().nullable(),
    lankaqrImageUrl: publicImageUrlSchema,
    instagramUrl: publicHttpsUrlSchema,
    facebookUrl: publicHttpsUrlSchema,
    websiteUrl: publicHttpsUrlSchema,
    logoUrl: logoUrlSchema,
    galleryImages: z.array(galleryImageSchema).max(12).optional(),
    payhereEnabled: z.boolean().optional(),
    payhereMerchantId: z.string().trim().max(100).optional().nullable(),
    payhereMerchantSecret: z.string().trim().max(1000).optional().nullable(),
    paypalEnabled: z.boolean().optional(),
    paypalClientId: z.string().trim().max(200).optional().nullable(),
    paypalClientSecret: z.string().trim().max(1000).optional().nullable(),
    paymentsLkEnabled: z.boolean().optional(),
    paymentsLkSecretKey: z.string().trim().max(300).optional().nullable(),
    paymentsLkWebhookSecret: z.string().trim().max(300).optional().nullable(),
    hideDinayaBranding: z.boolean().optional(),
  })
  .merge(bookingThemeFieldsSchema);

export async function PATCH(req: NextRequest) {
  const authResult = await requireApiBusiness({ ownerOnly: true, req });
  if (!authResult.ok) {
    return authResult.response;
  }
  const context = authResult.context;

  const parsed = settingsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 });
  }

  const {
    address,
    description,
    facebookUrl,
    galleryImages,
    instagramUrl,
    bankTransferInstructions,
    businessType,
    cancellationPolicy,
    depositPolicy,
    language,
    lankaqrImageUrl,
    logoUrl,
    name,
    payhereEnabled,
    payhereMerchantId,
    payhereMerchantSecret,
    paypalEnabled,
    paypalClientId,
    paypalClientSecret,
    paymentsLkEnabled,
    paymentsLkSecretKey,
    paymentsLkWebhookSecret,
    hideDinayaBranding,
    accentColor,
    bookingPageBackground,
    bookingPageBackgroundColor,
    bookingHeroOverlay,
    bookingHeroOverlayOpacity,
    bookingThemePreset,
    bookingPanelBackground,
    phone,
    timezone,
    websiteUrl,
  } = parsed.data;

  if (hideDinayaBranding === true) {
    try {
      await requirePro(context.businessId, "publicBookingPageCustomization");
    } catch (error) {
      if (error instanceof PlanRequiredError) {
        return NextResponse.json(
          { error: "Remove Dinaya branding is available on Growth." },
          { status: 402 },
        );
      }
      throw error;
    }
  }

  const themeFieldsTouched =
    bookingPageBackground !== undefined ||
    bookingPageBackgroundColor !== undefined ||
    bookingHeroOverlay !== undefined ||
    bookingHeroOverlayOpacity !== undefined ||
    bookingThemePreset !== undefined ||
    bookingPanelBackground !== undefined;

  if (themeFieldsTouched) {
    try {
      await requirePro(context.businessId, "bookingPageTheme");
    } catch (error) {
      if (error instanceof PlanRequiredError) {
        return NextResponse.json(
          { error: "Page background and hero overlay are available on Pro and Growth." },
          { status: 402 },
        );
      }
      throw error;
    }
  }

  const [currentBusiness] = await db
    .select({
      logoUrl: businesses.logoUrl,
      galleryImages: businesses.galleryImages,
    })
    .from(businesses)
    .where(eq(businesses.id, context.businessId))
    .limit(1);

  const nextLogoUrl =
    logoUrl !== undefined ? logoUrl?.trim() || null : (currentBusiness?.logoUrl ?? null);
  const nextGalleryImages =
    galleryImages !== undefined
      ? galleryImages.filter(Boolean)
      : (currentBusiness?.galleryImages ?? []);

  const removedImageUrls = collectRemovedBusinessImageUrls(
    {
      logoUrl: currentBusiness?.logoUrl,
      galleryImages: currentBusiness?.galleryImages,
    },
    {
      logoUrl: nextLogoUrl,
      galleryImages: nextGalleryImages,
    },
  );

  await db
    .update(businesses)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(address !== undefined && { address: address || null }),
      ...(timezone !== undefined && { timezone }),
      ...(language !== undefined && { language }),
      ...(businessType !== undefined && { businessType: businessType || null }),
      ...(cancellationPolicy !== undefined && {
        cancellationPolicy: cancellationPolicy || null,
      }),
      ...(depositPolicy !== undefined && { depositPolicy: depositPolicy || null }),
      ...(bankTransferInstructions !== undefined && {
        bankTransferInstructions: bankTransferInstructions || null,
      }),
      ...(lankaqrImageUrl !== undefined && { lankaqrImageUrl: lankaqrImageUrl || null }),
      ...(instagramUrl !== undefined && {
        instagramUrl: normalizePublicHttpsUrl(instagramUrl),
      }),
      ...(facebookUrl !== undefined && {
        facebookUrl: normalizePublicHttpsUrl(facebookUrl),
      }),
      ...(websiteUrl !== undefined && {
        websiteUrl: normalizePublicHttpsUrl(websiteUrl),
      }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl?.trim() || null }),
      ...(galleryImages !== undefined && {
        galleryImages: galleryImages.filter(Boolean),
      }),
      ...(payhereEnabled !== undefined && { payhereEnabled: Boolean(payhereEnabled) }),
      ...(payhereMerchantId !== undefined && { payhereMerchantId: payhereMerchantId || null }),
      ...(payhereMerchantSecret !== undefined && payhereMerchantSecret !== null && {
        payhereMerchantSecret: payhereMerchantSecret.trim()
          ? encryptSecret(payhereMerchantSecret)
          : null,
      }),
      ...(paypalEnabled !== undefined && { paypalEnabled: Boolean(paypalEnabled) }),
      ...(paypalClientId !== undefined && { paypalClientId: paypalClientId || null }),
      ...(paypalClientSecret !== undefined && paypalClientSecret !== null && {
        paypalClientSecret: paypalClientSecret.trim()
          ? encryptSecret(paypalClientSecret)
          : null,
      }),
      ...(paymentsLkEnabled !== undefined && { paymentsLkEnabled: Boolean(paymentsLkEnabled) }),
      ...(paymentsLkSecretKey !== undefined && paymentsLkSecretKey !== null && {
        paymentsLkSecretKey: paymentsLkSecretKey.trim()
          ? encryptSecret(paymentsLkSecretKey)
          : null,
      }),
      ...(paymentsLkWebhookSecret !== undefined && paymentsLkWebhookSecret !== null && {
        paymentsLkWebhookSecret: paymentsLkWebhookSecret.trim()
          ? encryptSecret(paymentsLkWebhookSecret)
          : null,
      }),
      ...(hideDinayaBranding !== undefined && { hideDinayaBranding: Boolean(hideDinayaBranding) }),
      ...(accentColor !== undefined && { accentColor: accentColor || null }),
      ...(bookingPageBackground !== undefined && { bookingPageBackground }),
      ...(bookingPageBackgroundColor !== undefined && {
        bookingPageBackgroundColor: bookingPageBackgroundColor || null,
      }),
      ...(bookingHeroOverlay !== undefined && { bookingHeroOverlay }),
      ...(bookingHeroOverlayOpacity !== undefined && { bookingHeroOverlayOpacity }),
      ...(bookingThemePreset !== undefined && { bookingThemePreset: bookingThemePreset || null }),
      ...(bookingPanelBackground !== undefined && { bookingPanelBackground }),
    })
    .where(eq(businesses.id, context.businessId));

  await syncBusinessPrimaryLocation(context.businessId, {
    ...(name !== undefined && { name }),
    ...(address !== undefined && { address: address || null }),
    ...(phone !== undefined && { phone: phone || null }),
    ...(timezone !== undefined && { timezone }),
  });

  void logActivity({
    action: "updated",
    actorUserId: context.user.id,
    businessId: context.businessId,
    entity: "business",
    entityId: context.businessId,
    meta: { fields: Object.keys(parsed.data) },
  }).catch((error) => {
    console.error("Activity log write failed:", error);
  });

  if (removedImageUrls.length > 0) {
    void deleteBusinessImagesByPublicUrls(removedImageUrls, context.businessId).catch((error) => {
      console.error("Storage cleanup after settings update failed:", error);
    });
  }

  return NextResponse.json(ok({ id: context.businessId }));
}
