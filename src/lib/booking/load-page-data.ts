import { notFound } from "next/navigation";
import { db } from "@/db";
import { businesses, services, staff, staffServices, reviews, serviceCategories } from "@/db/schema";
import { listActiveLocations, getStaffLocationMap, ensureBusinessHasDefaultLocation } from "@/lib/locations";
import { eq, and, avg, count } from "drizzle-orm";
import { canUseFeature, resolveEffectivePlan } from "@/lib/plan";
import { resolveActiveRouter, type BookingRouter } from "@/lib/booking-router";
import { listActiveDealsForBusiness } from "@/lib/deals/queries";
import { backfillServiceSlugsForBusiness } from "@/lib/slot-reservations";
import { resolveServiceSlug } from "@/lib/service-slug";
import { getReviewDistribution } from "@/lib/reviews-public";
import { hasPublicColumn, withTransientDbRetry } from "@/lib/dashboard/db-compat";
import { loadBookingPageDataViaSupabase } from "@/lib/booking/load-page-data-rest";
import { canUseSupabaseRestDataSource } from "@/lib/supabase-server";

export type BookingPageData = NonNullable<Awaited<ReturnType<typeof loadBookingPageData>>>;

export async function loadBookingPageData(slug: string, serviceSlug?: string) {
  if (canUseSupabaseRestDataSource()) {
    return loadBookingPageDataViaSupabase(slug, serviceSlug);
  }
  return withTransientDbRetry(() => loadBookingPageDataInner(slug, serviceSlug));
}

async function loadBookingPageDataInner(slug: string, serviceSlug?: string) {
  const [includePaypal, includePaymentsLk, includeAccentColor, includeBookingTheme, includeBookingRouter, includeServiceSlug, includeServiceImage] =
    await Promise.all([
      hasPublicColumn("businesses", "paypal_enabled"),
      hasPublicColumn("businesses", "payments_lk_enabled"),
      hasPublicColumn("businesses", "accent_color"),
      hasPublicColumn("businesses", "booking_page_background"),
      hasPublicColumn("businesses", "booking_router"),
      hasPublicColumn("services", "slug"),
      hasPublicColumn("services", "image_url"),
    ]);

  const [businessRow] = await db
    .select({
      id: businesses.id,
      address: businesses.address,
      bankTransferInstructions: businesses.bankTransferInstructions,
      cancellationPolicy: businesses.cancellationPolicy,
      deletedAt: businesses.deletedAt,
      description: businesses.description,
      depositPolicy: businesses.depositPolicy,
      facebookUrl: businesses.facebookUrl,
      galleryImages: businesses.galleryImages,
      instagramUrl: businesses.instagramUrl,
      isSuspended: businesses.isSuspended,
      language: businesses.language,
      timezone: businesses.timezone,
      lankaqrImageUrl: businesses.lankaqrImageUrl,
      logoUrl: businesses.logoUrl,
      name: businesses.name,
      ...(includeBookingRouter ? { bookingRouter: businesses.bookingRouter } : {}),
      plan: businesses.plan,
      planExpiresAt: businesses.planExpiresAt,
      payhereEnabled: businesses.payhereEnabled,
      ...(includePaypal ? { paypalEnabled: businesses.paypalEnabled } : {}),
      ...(includePaymentsLk ? { paymentsLkEnabled: businesses.paymentsLkEnabled } : {}),
      phone: businesses.phone,
      slug: businesses.slug,
      websiteUrl: businesses.websiteUrl,
      hideDinayaBranding: businesses.hideDinayaBranding,
      ...(includeAccentColor ? { accentColor: businesses.accentColor } : {}),
      ...(includeBookingTheme
        ? {
            bookingPageBackground: businesses.bookingPageBackground,
            bookingPageBackgroundColor: businesses.bookingPageBackgroundColor,
            bookingPanelBackground: businesses.bookingPanelBackground,
            bookingHeroOverlay: businesses.bookingHeroOverlay,
            bookingHeroOverlayOpacity: businesses.bookingHeroOverlayOpacity,
            bookingThemePreset: businesses.bookingThemePreset,
          }
        : {}),
      customDomain: businesses.customDomain,
      customDomainVerified: businesses.customDomainVerified,
    })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);

  const business = businessRow
    ? {
        ...businessRow,
        bookingRouter: includeBookingRouter
          ? (businessRow as { bookingRouter?: unknown }).bookingRouter ?? null
          : null,
        accentColor: includeAccentColor
          ? (businessRow as { accentColor?: string | null }).accentColor ?? null
          : null,
        bookingPageBackground: includeBookingTheme
          ? (businessRow as { bookingPageBackground?: string | null }).bookingPageBackground ?? "white"
          : "white",
        bookingPageBackgroundColor: includeBookingTheme
          ? (businessRow as { bookingPageBackgroundColor?: string | null }).bookingPageBackgroundColor ?? null
          : null,
        bookingPanelBackground: includeBookingTheme
          ? (businessRow as { bookingPanelBackground?: string | null }).bookingPanelBackground ?? "white"
          : "white",
        bookingHeroOverlay: includeBookingTheme
          ? (businessRow as { bookingHeroOverlay?: string | null }).bookingHeroOverlay ?? "light"
          : "light",
        bookingHeroOverlayOpacity: includeBookingTheme
          ? (businessRow as { bookingHeroOverlayOpacity?: number | null }).bookingHeroOverlayOpacity ?? 60
          : 60,
        bookingThemePreset: includeBookingTheme
          ? (businessRow as { bookingThemePreset?: string | null }).bookingThemePreset ?? null
          : null,
        paypalEnabled: includePaypal
          ? Boolean((businessRow as { paypalEnabled?: boolean }).paypalEnabled)
          : false,
        paymentsLkEnabled: includePaymentsLk
          ? Boolean((businessRow as { paymentsLkEnabled?: boolean }).paymentsLkEnabled)
          : false,
      }
    : null;

  if (!business || business.deletedAt) notFound();

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

  await ensureBusinessHasDefaultLocation(business.id);
  await backfillServiceSlugsForBusiness(business.id);

  const intakeEnabled = canUseFeature(effectivePlan, "intakeForms");

  const [serviceList, staffList, reviewList, ratingData, reviewDistribution, locationList, staffLocationMap, activeDeals] =
    await Promise.all([
      db
        .select({
          id: services.id,
          businessId: services.businessId,
          name: services.name,
          ...(includeServiceSlug ? { slug: services.slug } : {}),
          ...(includeServiceImage ? { imageUrl: services.imageUrl } : {}),
          description: services.description,
          durationMinutes: services.durationMinutes,
          priceLkr: services.priceLkr,
          requiresPayment: services.requiresPayment,
          depositPercent: services.depositPercent,
          isActive: services.isActive,
          beforeBuffer: services.beforeBuffer,
          afterBuffer: services.afterBuffer,
          minimumNoticeHours: services.minimumNoticeHours,
          dailyCapacity: services.dailyCapacity,
          maximumAdvanceDays: services.maximumAdvanceDays,
          intakeQuestions: services.intakeQuestions,
          priceVariants: services.priceVariants,
          createdAt: services.createdAt,
          categoryId: services.categoryId,
          categoryName: serviceCategories.name,
        })
        .from(services)
        .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
        .where(and(eq(services.businessId, business.id), eq(services.isActive, true))),
      db.select().from(staff).where(and(eq(staff.businessId, business.id), eq(staff.isActive, true))),
      db
        .select()
        .from(reviews)
        .where(and(eq(reviews.businessId, business.id), eq(reviews.isPublished, true)))
        .orderBy(reviews.createdAt)
        .limit(20),
      db
        .select({ avg: avg(reviews.rating), count: count() })
        .from(reviews)
        .where(and(eq(reviews.businessId, business.id), eq(reviews.isPublished, true))),
      getReviewDistribution(business.id),
      listActiveLocations(business.id),
      getStaffLocationMap(business.id),
      listActiveDealsForBusiness(business.id),
    ]);

  const assignments = await db
    .select({ staffId: staffServices.staffId, serviceId: staffServices.serviceId })
    .from(staffServices)
    .innerJoin(staff, eq(staffServices.staffId, staff.id))
    .where(eq(staff.businessId, business.id));

  const servicesWithSlugs = serviceList.map((s) => ({
    ...s,
    slug: resolveServiceSlug({
      slug: includeServiceSlug ? (s as { slug?: string | null }).slug ?? null : null,
      name: s.name,
      id: s.id,
    }),
    imageUrl: includeServiceImage ? (s as { imageUrl?: string | null }).imageUrl ?? null : null,
    intakeQuestions: intakeEnabled ? s.intakeQuestions ?? [] : [],
    priceVariants: s.priceVariants ?? [],
  }));

  const initialService = serviceSlug
    ? servicesWithSlugs.find((s) => s.slug === serviceSlug) ?? null
    : null;

  if (serviceSlug && !initialService) notFound();

  const bookingRouter = intakeEnabled
    ? resolveActiveRouter(business.bookingRouter as BookingRouter | null, servicesWithSlugs.map((s) => s.id))
    : null;

  return {
    status: "ok" as const,
    business,
    effectivePlan,
    services: servicesWithSlugs,
    staff: staffList,
    staffServiceMap: assignments,
    staffLocationMap,
    locations: locationList,
    reviews: reviewList,
    avgRating: ratingData[0]?.avg ? parseFloat(ratingData[0].avg) : null,
    reviewCount: ratingData[0]?.count ?? 0,
    reviewDistribution,
    activeDeals,
    bookingRouter,
    initialService,
    hideBranding: Boolean(
      business.hideDinayaBranding && canUseFeature(effectivePlan, "publicBookingPageCustomization"),
    ),
    canCustomize: canUseFeature(effectivePlan, "publicBookingPageCustomization"),
  };
}
