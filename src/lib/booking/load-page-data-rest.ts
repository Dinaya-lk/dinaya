import { notFound } from "next/navigation";
import { canUseFeature, resolveEffectivePlan } from "@/lib/plan";
import { resolveActiveRouter, type BookingRouter } from "@/lib/booking-router";
import { resolveServiceSlug } from "@/lib/service-slug";
import { emptyReviewDistribution } from "@/lib/reviews-public";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { IntakeQuestion } from "@/lib/intake";
import type { ServicePriceVariant } from "@/lib/service-variants";

type JsonRow = Record<string, unknown>;

function asDate(value: unknown): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(String(value));
}

function mapBusiness(row: JsonRow) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    timezone: String(row.timezone ?? "Asia/Colombo"),
    language: String(row.language ?? "en"),
    cancellationPolicy: (row.cancellation_policy as string | null) ?? null,
    depositPolicy: (row.deposit_policy as string | null) ?? null,
    bankTransferInstructions: (row.bank_transfer_instructions as string | null) ?? null,
    lankaqrImageUrl: (row.lankaqr_image_url as string | null) ?? null,
    instagramUrl: (row.instagram_url as string | null) ?? null,
    facebookUrl: (row.facebook_url as string | null) ?? null,
    websiteUrl: (row.website_url as string | null) ?? null,
    galleryImages: (row.gallery_images as string[] | null) ?? null,
    bookingRouter: (row.booking_router as BookingRouter | null) ?? null,
    plan: row.plan as "trial" | "starter" | "pro" | "max" | "expired",
    planExpiresAt: asDate(row.plan_expires_at),
    payhereEnabled: Boolean(row.payhere_enabled),
    paypalEnabled: Boolean(row.paypal_enabled),
    paymentsLkEnabled: Boolean(row.payments_lk_enabled),
    hideDinayaBranding: Boolean(row.hide_dinaya_branding),
    accentColor: (row.accent_color as string | null) ?? null,
    bookingPageBackground: (row.booking_page_background as string | null) ?? "white",
    bookingPageBackgroundColor: (row.booking_page_background_color as string | null) ?? null,
    bookingPanelBackground: (row.booking_panel_background as string | null) ?? "white",
    bookingHeroOverlay: (row.booking_hero_overlay as string | null) ?? "light",
    bookingHeroOverlayOpacity: Number(row.booking_hero_overlay_opacity ?? 60),
    bookingThemePreset: (row.booking_theme_preset as string | null) ?? null,
    customDomain: (row.custom_domain as string | null) ?? null,
    customDomainVerified: Boolean(row.custom_domain_verified),
    isSuspended: Boolean(row.is_suspended),
    deletedAt: asDate(row.deleted_at),
  };
}

function mapService(row: JsonRow, intakeEnabled: boolean) {
  const category = row.service_categories as { name?: string } | null;
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    slug: resolveServiceSlug({
      slug: (row.slug as string | null) ?? null,
      name: String(row.name),
      id: String(row.id),
    }),
    imageUrl: (row.image_url as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    durationMinutes: Number(row.duration_minutes),
    priceLkr: Number(row.price_lkr ?? 0),
    requiresPayment: Boolean(row.requires_payment),
    depositPercent: Number(row.deposit_percent ?? 0),
    isActive: Boolean(row.is_active),
    beforeBuffer: Number(row.before_buffer ?? 0),
    afterBuffer: Number(row.after_buffer ?? 0),
    minimumNoticeHours: Number(row.minimum_notice_hours ?? 0),
    dailyCapacity: (row.daily_capacity as number | null) ?? null,
    maximumAdvanceDays: (row.maximum_advance_days as number | null) ?? null,
    intakeQuestions: intakeEnabled ? ((row.intake_questions as IntakeQuestion[] | null) ?? []) : [],
    priceVariants: (row.price_variants as ServicePriceVariant[] | null) ?? [],
    createdAt: asDate(row.created_at) ?? new Date(),
    categoryId: (row.category_id as string | null) ?? null,
    categoryName: category?.name ?? null,
  };
}

function mapStaff(row: JsonRow) {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    bio: (row.bio as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    isActive: Boolean(row.is_active),
    createdAt: asDate(row.created_at) ?? new Date(),
  };
}

function mapReview(row: JsonRow) {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    bookingId: (row.booking_id as string | null) ?? null,
    clientName: String(row.client_name),
    rating: Number(row.rating),
    comment: (row.comment as string | null) ?? null,
    ownerReply: (row.owner_reply as string | null) ?? null,
    ownerRepliedAt: asDate(row.owner_replied_at),
    ownerReplySource: (row.owner_reply_source as string | null) ?? null,
    isPublished: Boolean(row.is_published),
    createdAt: asDate(row.created_at) ?? new Date(),
  };
}

function mapLocation(row: JsonRow) {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    slug: (row.slug as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    timezone: String(row.timezone ?? "Asia/Colombo"),
    isActive: Boolean(row.is_active),
    isDefault: Boolean(row.is_default),
    sortOrder: Number(row.sort_order ?? 0),
    aiConfig: (row.ai_config as Record<string, unknown>) ?? {},
    createdAt: asDate(row.created_at) ?? new Date(),
  };
}

export async function loadBookingPageDataViaSupabase(slug: string, serviceSlug?: string) {
  const sb = getSupabaseServerClient();
  if (!sb) notFound();

  const { data: businessRow, error: businessError } = await sb
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (businessError || !businessRow) notFound();

  const business = mapBusiness(businessRow as JsonRow);
  if (business.deletedAt) notFound();

  if (business.isSuspended) {
    return { status: "suspended" as const, business };
  }

  const effectivePlan = resolveEffectivePlan({
    storedPlan: business.plan,
    planExpiresAt: business.planExpiresAt,
  });

  if (!canUseFeature(effectivePlan, "publicBookingPage")) {
    return { status: "offline" as const, business };
  }

  const intakeEnabled = canUseFeature(effectivePlan, "intakeForms");

  const [
    { data: serviceRows },
    { data: staffRows },
    { data: reviewRows },
    { data: locationRows },
    { data: staffLocationRows },
    { data: assignmentRows },
  ] = await Promise.all([
    sb
      .from("services")
      .select("*, service_categories(name)")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("name"),
    sb.from("staff").select("*").eq("business_id", business.id).eq("is_active", true),
    sb
      .from("reviews")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .limit(20),
    sb
      .from("locations")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    sb
      .from("staff_locations")
      .select("staff_id, location_id, is_primary, staff!inner(business_id)")
      .eq("staff.business_id", business.id),
    sb
      .from("staff_services")
      .select("staff_id, service_id, staff!inner(business_id)")
      .eq("staff.business_id", business.id),
  ]);

  const services = (serviceRows ?? []).map((row) => mapService(row as JsonRow, intakeEnabled));
  const staff = (staffRows ?? []).map((row) => mapStaff(row as JsonRow));
  const reviews = (reviewRows ?? []).map((row) => mapReview(row as JsonRow));
  const locations = (locationRows ?? []).map((row) => mapLocation(row as JsonRow));
  const staffLocationMap = (staffLocationRows ?? []).map((row) => ({
    staffId: String((row as JsonRow).staff_id),
    locationId: String((row as JsonRow).location_id),
    isPrimary: Boolean((row as JsonRow).is_primary),
  }));
  const staffServiceMap = (assignmentRows ?? []).map((row) => ({
    staffId: String((row as JsonRow).staff_id),
    serviceId: String((row as JsonRow).service_id),
  }));

  const reviewDistribution = emptyReviewDistribution();
  let ratingSum = 0;
  for (const review of reviews) {
    if (review.rating >= 1 && review.rating <= 5) {
      reviewDistribution[review.rating as keyof typeof reviewDistribution] += 1;
      ratingSum += review.rating;
    }
  }
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? ratingSum / reviewCount : null;

  const initialService = serviceSlug
    ? services.find((service) => service.slug === serviceSlug) ?? null
    : null;
  if (serviceSlug && !initialService) notFound();

  const bookingRouter = intakeEnabled
    ? resolveActiveRouter(business.bookingRouter, services.map((service) => service.id))
    : null;

  return {
    status: "ok" as const,
    business,
    effectivePlan,
    services,
    staff,
    staffServiceMap,
    staffLocationMap,
    locations,
    reviews,
    avgRating,
    reviewCount,
    reviewDistribution,
    activeDeals: [],
    bookingRouter,
    initialService,
    hideBranding: Boolean(
      business.hideDinayaBranding && canUseFeature(effectivePlan, "publicBookingPageCustomization"),
    ),
    canCustomize: canUseFeature(effectivePlan, "publicBookingPageCustomization"),
  };
}
