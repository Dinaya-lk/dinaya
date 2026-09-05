import { headers } from "next/headers";
import BookingWizard from "@/components/booking/BookingWizard";
import EmbedResizeReporter from "@/components/booking/EmbedResizeReporter";
import { BookingHubFlow } from "@/components/booking/BookingHubFlow";
import { BookingSafeImage } from "@/components/booking/BookingGalleryStrip";
import { BookingTheme } from "@/components/booking/BookingTheme";
import { BookingThemeToggle } from "@/components/booking/BookingThemeToggle";
import { getBookingCopy } from "@/lib/i18n";
import { normalizePublicHttpsUrl } from "@/lib/public-url";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { BookingPageData } from "@/lib/booking/load-page-data";
import { resolveBookingTheme, type BookingThemeOverrides } from "@/lib/booking-theme";
import type { BookingContentPreviewOverrides } from "@/lib/booking/theme-editor-preview";
import { canUseFeature } from "@/lib/plan";
import {
  createCalendarOverlayTicket,
  isCalendarOverlayOriginAllowed,
} from "@/lib/calendar-overlay-ticket";
import { isResolvableBookingImageUrl, resolveHeroImageUrl } from "@/lib/booking/hero-image";
import type { CalendarOverlayConfig } from "./useGoogleCalendarOverlay";

type Props = {
  data: Extract<BookingPageData, { status: "ok" }>;
  dealId?: string | null;
  mode: "hub" | "service" | "embed";
  serviceSlug?: string;
  hideGallery?: boolean;
  themePreview?: BookingThemeOverrides | null;
  contentPreview?: BookingContentPreviewOverrides | null;
};

async function buildCalendarOverlayConfig(
  mode: Props["mode"],
  language: string,
): Promise<CalendarOverlayConfig | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (mode === "embed" || !process.env.GOOGLE_CLIENT_ID || !appUrl) {
    return null;
  }

  try {
    const requestHeaders = await headers();
    const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || requestHeaders.get("host");
    if (!host) return null;

    const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol =
      forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    const origin = new URL(`${protocol}://${host}`).origin;
    if (
      !isCalendarOverlayOriginAllowed({
        origin,
        appUrl,
        appDomain: process.env.NEXT_PUBLIC_APP_DOMAIN,
      })
    ) {
      return null;
    }
    const { ticket, channel } = createCalendarOverlayTicket(
      origin,
      language === "si" || language === "ta" ? language : "en",
    );
    const connectUrl = new URL("/calendar-overlay/connect", appUrl);
    connectUrl.searchParams.set("ticket", ticket);
    return { connectUrl: connectUrl.toString(), channel };
  } catch {
    return null;
  }
}

export default async function BookingPageContent({
  data,
  dealId,
  mode,
  serviceSlug,
  hideGallery,
  themePreview,
  contentPreview,
}: Props) {
  const {
    business: sourceBusiness,
    services,
    staff,
    staffServiceMap,
    staffLocationMap,
    locations,
    reviews: reviewList,
    avgRating,
    reviewCount,
    reviewDistribution,
    activeDeals,
    bookingRouter,
    hideBranding,
    initialService,
    effectivePlan,
  } = data;

  const business = {
    ...sourceBusiness,
    logoUrl:
      contentPreview?.logoUrl !== undefined ? contentPreview.logoUrl : sourceBusiness.logoUrl,
    galleryImages:
      contentPreview?.galleryImages !== undefined
        ? contentPreview.galleryImages
        : sourceBusiness.galleryImages,
  };

  const resolvedHideBranding =
    contentPreview?.hideDinayaBranding !== undefined
      ? contentPreview.hideDinayaBranding
      : hideBranding;

  const resolvedTheme = resolveBookingTheme(business, {
    canUseExtendedTheme: canUseFeature(effectivePlan, "bookingPageTheme"),
    overrides: themePreview ?? undefined,
  });

  const copy = getBookingCopy(business.language);
  const calendarOverlayConfig = await buildCalendarOverlayConfig(mode, business.language);
  const gallery = (business.galleryImages ?? []).filter(isResolvableBookingImageUrl);
  const heroImageUrl = resolveHeroImageUrl(business.galleryImages, { hideGallery });
  const staffWithBio = staff.filter((s) => s.bio || s.avatarUrl);
  const instagramUrl = normalizePublicHttpsUrl(business.instagramUrl);
  const facebookUrl = normalizePublicHttpsUrl(business.facebookUrl);
  const websiteUrl = normalizePublicHttpsUrl(business.websiteUrl);

  const hasTrustBlock = Boolean(
    business.cancellationPolicy ||
      business.depositPolicy ||
      business.bankTransferInstructions ||
      business.lankaqrImageUrl,
  );

  const hasAboutSection = Boolean(
    business.description ||
      business.address ||
      business.phone ||
      instagramUrl ||
      facebookUrl ||
      websiteUrl,
  );

  const initialReviews = reviewList.map((review) => ({
    id: review.id,
    clientName: review.clientName,
    rating: review.rating,
    comment: review.comment,
    ownerReply: review.ownerReply,
    createdAt: review.createdAt.toISOString(),
  }));

  const showHub = mode === "hub" && services.length > 1;
  const showWizard =
    mode === "service" ||
    mode === "embed" ||
    services.length === 1;

  const bookerFocus = mode === "service" || mode === "embed" || services.length === 1;
  const centeredLayout = bookerFocus || showHub;
  const hubHasHero = showHub && Boolean(heroImageUrl);

  const hideSidebarSections =
    mode === "embed" ? hideGallery !== false : Boolean(hideGallery);

  const useHubFlow = mode !== "embed";

  return (
    <BookingTheme theme={resolvedTheme} embed={mode === "embed"} className="min-h-dvh w-full">
      <div
        className={
          useHubFlow
            ? cn(
                "booking-page-bg min-h-dvh w-full",
                hubHasHero && "flex flex-col items-center pt-0 md:pt-4",
                !hubHasHero &&
                  centeredLayout &&
                  "flex flex-col items-center md:justify-center md:py-10",
              )
            : centeredLayout
              ? hubHasHero
                ? "booking-page-bg flex min-h-dvh w-full flex-col items-center pt-0 md:pt-4"
                : "booking-page-bg flex min-h-dvh w-full flex-col items-center md:justify-center md:py-10"
              : "booking-page-bg min-h-dvh w-full"
        }
        data-booking-embed-root={mode === "embed" ? "" : undefined}
      >
        {mode === "embed" ? <EmbedResizeReporter slug={business.slug} /> : null}
        {mode !== "embed" ? <BookingThemeToggle /> : null}

        {useHubFlow ? (
          <BookingHubFlow
            mode={mode === "service" ? "service" : "hub"}
            business={{
              id: business.id,
              slug: business.slug,
              name: business.name,
              description: business.description,
              logoUrl: business.logoUrl,
              address: business.address,
              phone: business.phone,
              language: business.language,
              timezone: business.timezone,
              cancellationPolicy: business.cancellationPolicy,
              depositPolicy: business.depositPolicy,
              bankTransferInstructions: business.bankTransferInstructions,
              lankaqrImageUrl: business.lankaqrImageUrl,
              payhereEnabled: business.payhereEnabled,
              paypalEnabled: business.paypalEnabled,
              instagramUrl,
              facebookUrl,
              websiteUrl,
            }}
            services={services}
            staff={staff}
            staffServiceMap={staffServiceMap}
            staffLocationMap={staffLocationMap}
            locations={locations}
            copy={copy}
            resolvedTheme={resolvedTheme}
            hideBranding={resolvedHideBranding}
            activeDeals={activeDeals}
            dealId={dealId}
            bookingRouter={bookingRouter}
            calendarOverlayConfig={calendarOverlayConfig}
            avgRating={avgRating}
            reviewCount={reviewCount}
            reviewDistribution={reviewDistribution}
            initialReviews={initialReviews}
            heroImageUrl={heroImageUrl}
            gallery={gallery}
            staffWithBio={staffWithBio}
            serverInitialService={initialService}
            serviceSlug={serviceSlug}
            hasTrustBlock={hasTrustBlock}
            hasAboutSection={hasAboutSection}
            hideSidebarSections={hideSidebarSections}
          />
        ) : (
          <div
            className={
              centeredLayout ? "w-full max-w-5xl px-0 md:px-4" : "mx-auto max-w-5xl px-0 md:px-8 md:py-6"
            }
          >
            {renderEmbedLegacyLayout()}
          </div>
        )}
      </div>
    </BookingTheme>
  );

  function renderEmbedLegacyLayout() {
    const wizardService =
      services.length === 1 ? services[0]! : initialService;

    return (
      <>
        {!centeredLayout && !hideSidebarSections && gallery.length > 0 && (
          <Card className="overflow-hidden rounded-none border-x-0 border-t-0 shadow-none md:mb-6 md:rounded-xl md:border-x md:shadow-sm">
            <div
              className={`grid gap-0.5 overflow-hidden md:gap-2 ${
                gallery.length === 1
                  ? "grid-cols-1"
                  : gallery.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
              }`}
            >
              {gallery.slice(0, 12).map((url: string, i: number) => (
                <div
                  key={url}
                  className={`relative overflow-hidden bg-muted ${
                    gallery.length === 3 && i === 0
                      ? "col-span-2 row-span-2 aspect-square"
                      : gallery.length >= 4 && i === 0
                        ? "col-span-2 aspect-video"
                        : "aspect-square"
                  }`}
                >
                  <BookingSafeImage url={url} sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {showWizard ? (
          <BookingWizard
            business={{
              id: business.id,
              accentColor: resolvedTheme.accentColor,
              bankTransferInstructions: business.bankTransferInstructions,
              cancellationPolicy: business.cancellationPolicy,
              depositPolicy: business.depositPolicy,
              language: business.language,
              timezone: business.timezone,
              lankaqrImageUrl: business.lankaqrImageUrl,
              name: business.name,
              payhereEnabled: business.payhereEnabled,
              paypalEnabled: business.paypalEnabled,
              slug: business.slug,
              logoUrl: business.logoUrl,
              hideBranding: resolvedHideBranding,
            }}
            services={services}
            bookingRouter={bookingRouter}
            staff={staff}
            staffServiceMap={staffServiceMap}
            staffLocationMap={staffLocationMap}
            locations={locations}
            showBranding
            activeDeals={activeDeals}
            initialDealId={dealId ?? null}
            initialService={wizardService}
            lockServiceSelection={false}
            embedMode
            calendarOverlayConfig={calendarOverlayConfig}
            avgRating={avgRating}
            reviewCount={reviewCount}
            businessDescription={business.description}
            teamMembers={staffWithBio}
            bookingTheme={resolvedTheme}
          />
        ) : null}
      </>
    );
  }
}
