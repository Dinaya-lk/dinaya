import SettingsForm from "@/components/dashboard/SettingsForm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { canUseFeature, resolveEffectivePlan } from "@/lib/plan";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function SettingsPage() {
  const { businessId } = await requireOwner();
  const [business] = await db
    .select({
      address: businesses.address,
      bankTransferInstructions: businesses.bankTransferInstructions,
      businessType: businesses.businessType,
      cancellationPolicy: businesses.cancellationPolicy,
      description: businesses.description,
      depositPolicy: businesses.depositPolicy,
      facebookUrl: businesses.facebookUrl,
      galleryImages: businesses.galleryImages,
      logoUrl: businesses.logoUrl,
      instagramUrl: businesses.instagramUrl,
      language: businesses.language,
      lankaqrImageUrl: businesses.lankaqrImageUrl,
      name: businesses.name,
      payhereEnabled: businesses.payhereEnabled,
      payhereMerchantId: businesses.payhereMerchantId,
      hasPayhereMerchantSecret: businesses.payhereMerchantSecret,
      paypalEnabled: businesses.paypalEnabled,
      paypalClientId: businesses.paypalClientId,
      hasPaypalClientSecret: businesses.paypalClientSecret,
      paymentsLkEnabled: businesses.paymentsLkEnabled,
      hasPaymentsLkSecretKey: businesses.paymentsLkSecretKey,
      hasPaymentsLkWebhookSecret: businesses.paymentsLkWebhookSecret,
      hideDinayaBranding: businesses.hideDinayaBranding,
      accentColor: businesses.accentColor,
      customDomain: businesses.customDomain,
      customDomainVerified: businesses.customDomainVerified,
      plan: businesses.plan,
      planExpiresAt: businesses.planExpiresAt,
      phone: businesses.phone,
      slug: businesses.slug,
      timezone: businesses.timezone,
      websiteUrl: businesses.websiteUrl,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) notFound();

  // Effective plan so an expired/lapsed business can't see the customization UI.
  const plan = resolveEffectivePlan({ storedPlan: business.plan, planExpiresAt: business.planExpiresAt });

  return (
    <SettingsForm
      business={{
        ...business,
        hasPayhereMerchantSecret: Boolean(business?.hasPayhereMerchantSecret),
        hasPaypalClientSecret: Boolean(business?.hasPaypalClientSecret),
        hasPaymentsLkSecretKey: Boolean(business?.hasPaymentsLkSecretKey),
        hasPaymentsLkWebhookSecret: Boolean(business?.hasPaymentsLkWebhookSecret),
        hideDinayaBranding: business.hideDinayaBranding,
        customDomain: business.customDomain,
        customDomainVerified: Boolean(business.customDomainVerified),
        canCustomizeBookingPage: canUseFeature(plan, "publicBookingPageCustomization"),
      }}
    />
  );
}
