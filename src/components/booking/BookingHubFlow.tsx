"use client";

import BookingWizard from "@/components/booking/BookingWizard";
import BookingBranding from "@/components/booking/BookingBranding";
import BookingServiceHub from "@/components/booking/BookingServiceHub";
import { BookingPolicyAccordion } from "@/components/booking/BookingPolicyAccordion";
import { BookingTeamSection } from "@/components/booking/BookingTeamSection";
import { BookingReviewsSection } from "@/components/booking/BookingReviewsSection";
import { BookingStepTransition } from "@/components/booking/BookingStepTransition";
import type { BookingService } from "@/components/booking/BookingWizard";
import type { ResolvedBookingTheme } from "@/lib/booking-theme";
import type { BookingCopy } from "@/lib/i18n";
import type { ReviewDistribution } from "@/lib/reviews-public";
import type { SerializedPublicReview } from "@/components/booking/BookingReviewsSection";
import type { DealListItem } from "@/lib/deals/queries";
import type { BookingRouter } from "@/lib/booking-router";
import type { Staff, Location } from "@/db/schema";
import type { CalendarOverlayConfig } from "@/components/booking/useGoogleCalendarOverlay";
import { useBookingHubNavigation } from "@/lib/booking/use-booking-hub-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getBusinessRating } from "@/components/booking/BusinessRating";
import { BookingSafeImage } from "@/components/booking/BookingGalleryStrip";

type Business = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  language: string;
  timezone: string;
  cancellationPolicy: string | null;
  depositPolicy: string | null;
  bankTransferInstructions: string | null;
  lankaqrImageUrl: string | null;
  payhereEnabled: boolean;
  paypalEnabled: boolean;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
};

export type BookingHubFlowProps = {
  mode: "hub" | "service";
  business: Business;
  services: BookingService[];
  staff: Staff[];
  staffServiceMap: { staffId: string; serviceId: string }[];
  staffLocationMap: { staffId: string; locationId: string }[];
  locations: Pick<Location, "id" | "name" | "address">[];
  copy: BookingCopy;
  resolvedTheme: ResolvedBookingTheme;
  hideBranding: boolean;
  activeDeals: DealListItem[];
  dealId?: string | null;
  bookingRouter: BookingRouter | null;
  calendarOverlayConfig: CalendarOverlayConfig | null;
  avgRating?: number | null;
  reviewCount?: number;
  reviewDistribution: ReviewDistribution;
  initialReviews: SerializedPublicReview[];
  heroImageUrl: string | null;
  gallery: string[];
  staffWithBio: Pick<Staff, "id" | "name" | "bio" | "avatarUrl">[];
  serverInitialService: BookingService | null;
  serviceSlug?: string;
  hasTrustBlock: boolean;
  hasAboutSection: boolean;
  hideSidebarSections: boolean;
};

export function BookingHubFlow({
  mode,
  business,
  services,
  staff,
  staffServiceMap,
  staffLocationMap,
  locations,
  copy,
  resolvedTheme,
  hideBranding,
  activeDeals,
  dealId,
  bookingRouter,
  calendarOverlayConfig,
  avgRating,
  reviewCount,
  reviewDistribution,
  initialReviews,
  heroImageUrl,
  gallery,
  staffWithBio,
  serverInitialService,
  serviceSlug,
  hasTrustBlock,
  hasAboutSection,
  hideSidebarSections,
}: BookingHubFlowProps) {
  const enableInstantNavigation = mode === "hub" && services.length > 1;
  const initialService =
    mode === "service"
      ? serverInitialService
      : services.length === 1
        ? services[0]!
        : null;

  const { activeService, selectService, clearService } = useBookingHubNavigation({
    businessSlug: business.slug,
    services,
    initialService,
    enabled: enableInstantNavigation,
  });

  const showHub = enableInstantNavigation && !activeService;
  const showWizard =
    Boolean(activeService) ||
    mode === "service" ||
    services.length === 1;

  const bookerFocus = showWizard && !showHub;
  const centeredLayout = bookerFocus || showHub;
  const businessRating = getBusinessRating(avgRating, reviewCount);
  const showSecondarySections = !hideSidebarSections && !(bookerFocus && !showHub);

  const layoutMaxWidth = showHub
    ? "mx-auto w-full max-w-3xl px-3 md:px-4"
    : bookerFocus
      ? "mx-auto w-full max-w-6xl px-0 md:px-4"
      : "mx-auto max-w-5xl px-0 md:px-8 md:py-6";

  const hubBackHref =
    mode === "service" && services.length > 1 ? `/book/${business.slug}` : null;
  const onBackToHub = enableInstantNavigation && activeService ? clearService : undefined;

  const wizardService =
    activeService ??
    (mode === "service" ? serverInitialService : services.length === 1 ? services[0]! : null);

  const flowStep = showHub ? "hub" : "booker";

  const hubPanel = showHub ? (
    <BookingServiceHub
      businessSlug={business.slug}
      businessName={business.name}
      businessLogoUrl={business.logoUrl}
      businessDescription={business.description}
      businessAddress={business.address}
      businessPhone={business.phone}
      heroImageUrl={heroImageUrl}
      gallery={gallery}
      instagramUrl={business.instagramUrl}
      facebookUrl={business.facebookUrl}
      websiteUrl={business.websiteUrl}
      services={services}
      copy={copy}
      avgRating={avgRating}
      reviewCount={reviewCount}
      reviewDistribution={reviewDistribution}
      initialReviews={initialReviews}
      cancellationPolicy={business.cancellationPolicy}
      depositPolicy={business.depositPolicy}
      bankTransferInstructions={business.bankTransferInstructions}
      onSelectService={selectService}
    />
  ) : null;

  const wizardPanel =
    showWizard && wizardService ? (
      <BookingWizard
        key={wizardService.id}
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
          hideBranding,
        }}
        services={services}
        bookingRouter={bookingRouter}
        staff={staff}
        staffServiceMap={staffServiceMap}
        staffLocationMap={staffLocationMap}
        locations={locations}
        showBranding={!hideBranding}
        activeDeals={activeDeals}
        initialDealId={dealId ?? null}
        initialService={wizardService}
        lockServiceSelection={
          (mode === "service" && Boolean(serviceSlug)) ||
          (enableInstantNavigation && Boolean(activeService))
        }
        calendarOverlayConfig={calendarOverlayConfig}
        avgRating={avgRating}
        reviewCount={reviewCount}
        businessDescription={business.description}
        teamMembers={staffWithBio}
        hubHref={onBackToHub ? null : hubBackHref}
        onBackToHub={onBackToHub}
        instantNav={enableInstantNavigation}
        centeredBookerLayout={bookerFocus}
        bookingTheme={resolvedTheme}
      />
    ) : null;

  const hubFlowPanels = enableInstantNavigation ? (
    <>
      {hubPanel}
      {wizardPanel}
    </>
  ) : (
    <BookingStepTransition step={flowStep}>
      {hubPanel}
      {wizardPanel}
    </BookingStepTransition>
  );

  const flowBody = (
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
            {gallery.slice(0, 12).map((url, i) => (
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

      {!centeredLayout && !hideSidebarSections && hasTrustBlock && (
        <>
          <BookingPolicyAccordion
            copy={copy}
            cancellationPolicy={business.cancellationPolicy}
            depositPolicy={business.depositPolicy}
            bankTransferInstructions={business.bankTransferInstructions}
          />
          <Card className="mx-0 mb-4 hidden border-dashed bg-muted/30 md:mx-0 md:block">
            <CardContent className="grid gap-4 p-4 text-sm sm:grid-cols-2">
              {business.cancellationPolicy && (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{copy.cancellationPolicy}</p>
                  <p className="text-muted-foreground">{business.cancellationPolicy}</p>
                </div>
              )}
              {business.depositPolicy && (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{copy.depositPolicy}</p>
                  <p className="text-muted-foreground">{business.depositPolicy}</p>
                </div>
              )}
              {business.bankTransferInstructions && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="font-medium text-foreground">{copy.localPayment}</p>
                  <p className="text-muted-foreground">{business.bankTransferInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {hubFlowPanels}

      {centeredLayout && !showHub && showSecondarySections && hasTrustBlock && (
        <div className="mt-4 border-t border-border/60 px-4 pt-4 md:mt-5 md:rounded-xl md:border md:bg-card/50 md:px-5 md:py-4">
          <BookingPolicyAccordion
            copy={copy}
            cancellationPolicy={business.cancellationPolicy}
            depositPolicy={business.depositPolicy}
            bankTransferInstructions={business.bankTransferInstructions}
          />
        </div>
      )}

      {!showHub && showSecondarySections && hasAboutSection && (
        <Card
          className={`mt-0 overflow-hidden rounded-none border-x-0 shadow-none ${
            centeredLayout
              ? "mt-6 border-border/60 md:rounded-xl md:border-x md:shadow-none"
              : "md:mt-6 md:rounded-xl md:border-x md:shadow-sm"
          }`}
        >
          <CardContent className="p-6">
            {business.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{business.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {!centeredLayout && !hideSidebarSections && staffWithBio.length > 0 && (
        <BookingTeamSection
          members={staffWithBio}
          copy={copy}
          variant={staffWithBio.length > 3 ? "dialog" : "card"}
          className={staffWithBio.length > 3 ? "mt-6 flex justify-center" : "md:px-0"}
        />
      )}

      {!showHub && showSecondarySections && businessRating && (
        <BookingReviewsSection
          businessSlug={business.slug}
          businessName={business.name}
          avgRating={businessRating.avgRating}
          reviewCount={businessRating.reviewCount}
          reviewDistribution={reviewDistribution}
          initialReviews={initialReviews}
          copy={copy}
          className={`flex justify-center pb-8 ${centeredLayout ? "mt-4" : "mt-6"}`}
        />
      )}
    </>
  );

  return (
    <div className={layoutMaxWidth}>
      {flowBody}
      {showHub && !hideBranding ? (
        <div className="mt-3 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:mt-4 md:px-0">
          <BookingBranding copy={copy} businessSlug={business.slug} />
        </div>
      ) : null}
    </div>
  );
}
