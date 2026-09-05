"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildServiceBookingPath } from "@/lib/booking-url";
import {
  formatHubLocationLine,
  hubTagline,
  serviceIconName,
} from "@/lib/booking-hub-present";
import { BookingServiceArrow } from "@/components/booking/BookingServiceArrow";
import { BookingServicePrice } from "@/components/booking/BookingServicePrice";
import { BookingServiceThumb } from "@/components/booking/BookingServiceThumb";
import { BookingGalleryStrip } from "@/components/booking/BookingGalleryStrip";
import { BookingSocialLinks } from "@/components/booking/BookingSocialLinks";
import { Icon } from "@/components/ui/Icon";
import { Separator } from "@/components/ui/separator";
import { BlurFade } from "@/components/ui/blur-fade";
import { BookingBusinessAvatar } from "@/components/booking/BookingBusinessAvatar";
import { BookingHubHeroImage } from "@/components/booking/BookingHubHeroImage";
import { BookingHubCta } from "@/components/booking/BookingHubCta";
import { BookingServiceSearch } from "@/components/booking/BookingServiceSearch";
import { BookingPolicyAccordion } from "@/components/booking/BookingPolicyAccordion";
import { BookingServiceListFooter } from "@/components/booking/BookingServiceListFooter";
import { useServiceListWindow } from "@/components/booking/useServiceListWindow";
import {
  filterServices,
  HUB_STICKY_CTA_MAX_SERVICES,
  shouldShowServiceSearch,
  uniqueServiceCategories,
} from "@/lib/booking/service-list-filter";
import { BusinessRating, getBusinessRating } from "./BusinessRating";
import {
  BookingReviewsSection,
  type SerializedPublicReview,
} from "./BookingReviewsSection";
import type { ReviewDistribution } from "@/lib/reviews-public";
import type { BookingCopy } from "@/lib/i18n";
import type { BookingService } from "./BookingWizard";

interface Props {
  businessSlug: string;
  businessName: string;
  businessLogoUrl?: string | null;
  businessDescription?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  heroImageUrl?: string | null;
  gallery?: string[];
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  services: BookingService[];
  copy: BookingCopy;
  avgRating?: number | null;
  reviewCount?: number;
  reviewDistribution?: ReviewDistribution;
  initialReviews?: SerializedPublicReview[];
  cancellationPolicy?: string | null;
  depositPolicy?: string | null;
  bankTransferInstructions?: string | null;
  onSelectService?: (service: BookingService) => void;
}

function HubBusinessLogo({
  businessName,
  logoUrl,
  variant = "header",
  className,
}: {
  businessName: string;
  logoUrl?: string | null;
  variant?: "header" | "hero";
  className?: string;
}) {
  return (
    <BookingBusinessAvatar
      name={businessName}
      logoUrl={logoUrl}
      size={variant === "hero" ? "hubHero" : "hub"}
      className={cn("border border-border/60 bg-card shadow-md ring-2 ring-card", className)}
    />
  );
}

export default function BookingServiceHub({
  businessSlug,
  businessName,
  businessLogoUrl,
  businessDescription,
  businessAddress,
  businessPhone,
  heroImageUrl,
  gallery = [],
  instagramUrl,
  facebookUrl,
  websiteUrl,
  services,
  copy,
  avgRating,
  reviewCount,
  reviewDistribution,
  initialReviews,
  cancellationPolicy,
  depositPolicy,
  bankTransferInstructions,
  onSelectService,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [heroDisplayed, setHeroDisplayed] = useState(Boolean(heroImageUrl));

  useEffect(() => {
    setHeroDisplayed(Boolean(heroImageUrl));
  }, [heroImageUrl]);

  const showHero = Boolean(heroImageUrl) && heroDisplayed;

  const categories = useMemo(() => uniqueServiceCategories(services), [services]);
  const filteredServices = useMemo(
    () => filterServices(services, query, activeCategory),
    [services, query, activeCategory],
  );
  const listWindow = useServiceListWindow({
    filteredServices,
    categories,
    query,
    activeCategory,
    uncategorizedLabel: copy.allServices,
  });

  if (services.length <= 1) return null;

  const showSearch = shouldShowServiceSearch(services.length, "hub");
  const showStickyBrowse = services.length > HUB_STICKY_CTA_MAX_SERVICES;
  const showStickyCta = true;
  const showingLabel = copy.showingServices
    .replace("{count}", String(filteredServices.length))
    .replace("{total}", String(services.length));

  const rating = getBusinessRating(avgRating, reviewCount);
  const primaryService = services[0]!;
  const primaryHref = buildServiceBookingPath(
    businessSlug,
    primaryService.slug ?? primaryService.id,
  );
  const primaryCtaLabel = showStickyBrowse
    ? copy.browseServices
    : `${copy.chooseTime} · ${primaryService.name}`;

  function renderHubService(service: BookingService) {
    const href = buildServiceBookingPath(businessSlug, service.slug ?? service.id);
    const iconName = serviceIconName(service.name);
    const rowClassName = cn(
      "group flex min-h-[4.75rem] w-full items-start gap-3.5 rounded-[1.375rem] border border-border/50 px-3.5 py-4 text-left md:px-4 md:py-[1.125rem]",
      "transition-[transform,background-color,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
      "hover:border-[var(--booking-accent)]/25 hover:bg-[var(--booking-accent-muted)] hover:shadow-sm",
      "active:scale-[0.96] motion-reduce:active:scale-100",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-accent-soft)]",
    );
    const rowContent = (
      <>
          <BookingServiceThumb
            name={service.name}
            imageUrl={service.imageUrl}
            iconName={iconName}
          />

          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-[var(--booking-accent)]">
              {service.name}
            </p>
            {service.categoryName ? (
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{service.categoryName}</p>
            ) : null}
            {service.description ? (
              <p className="mt-1 hidden line-clamp-2 text-sm leading-relaxed text-muted-foreground md:block">
                {service.description}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              {service.durationMinutes}m
              <span aria-hidden className="text-muted-foreground/50">
                {" "}
                ·{" "}
              </span>
              <BookingServicePrice priceLkr={service.priceLkr} />
            </p>
          </div>

          <BookingServiceArrow />
      </>
    );

    return (
      <li key={service.id}>
        {onSelectService ? (
          <button type="button" onClick={() => onSelectService(service)} className={rowClassName}>
            {rowContent}
          </button>
        ) : (
          <Link href={href} className={rowClassName}>
            {rowContent}
          </Link>
        )}
      </li>
    );
  }

  const tagline = hubTagline(businessDescription, copy.selectServiceHint);
  const locationLine = formatHubLocationLine(businessAddress, businessPhone);

  const shell = showHero
    ? "overflow-hidden rounded-none border-x-0 bg-transparent shadow-none md:rounded-2xl md:border-0"
    : "overflow-hidden rounded-2xl border-x-0 booking-panel-surface shadow-none md:border md:border-border/80 md:shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)] dark:md:shadow-none dark:md:ring-1 dark:md:ring-white/10";

  const contentShell = showHero
    ? "relative z-10 -mt-5 flex flex-col rounded-t-2xl booking-panel-surface pt-14 md:-mt-6 md:pt-[4.25rem]"
    : "flex flex-col";

  return (
    <BlurFade className={cn("w-full", showStickyCta ? "pb-28 md:pb-0" : "pb-4")}>
      <article className={cn("flex w-full flex-col", shell)}>
        {showHero ? (
          <div className="relative">
            <BookingHubHeroImage
              src={heroImageUrl!}
              alt={businessName}
              onUnavailable={() => setHeroDisplayed(false)}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center md:bottom-4">
              <div className="pointer-events-auto translate-y-1/3">
                <HubBusinessLogo
                  businessName={businessName}
                  logoUrl={businessLogoUrl}
                  variant="hero"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className={contentShell}>
        <header
          className={cn(
            "flex flex-col items-center px-4 pb-4 text-center md:px-6",
            showHero ? "pt-0" : "pt-6 md:pt-8",
          )}
        >
          {!showHero ? (
            <HubBusinessLogo
              businessName={businessName}
              logoUrl={businessLogoUrl}
              variant="header"
              className="mb-4 md:mb-5"
            />
          ) : null}
          <h1
            className={cn(
              "text-[1.625rem] font-bold leading-tight tracking-tight text-foreground md:text-3xl",
              showHero && "mt-1 md:mt-1.5",
            )}
          >
            {businessName}
          </h1>
          <p className="mt-2 hidden max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground md:block">
            {tagline}
          </p>
          {rating && reviewDistribution && initialReviews ? (
            <BookingReviewsSection
              businessSlug={businessSlug}
              businessName={businessName}
              avgRating={rating.avgRating}
              reviewCount={rating.reviewCount}
              reviewDistribution={reviewDistribution}
              initialReviews={initialReviews}
              copy={copy}
              variant="rating"
              className="mt-3"
            />
          ) : rating ? (
            <BusinessRating
              avgRating={rating.avgRating}
              reviewCount={rating.reviewCount}
              copy={copy}
              size="sm"
              compactAttribution
              className="mt-3 justify-center"
            />
          ) : null}
          {locationLine ? (
            <p className="mt-2 flex items-start justify-center gap-1.5 text-sm text-foreground/75">
              <Icon name="geo-alt" className="mt-0.5 shrink-0 text-muted-foreground" />
              <span>{locationLine}</span>
            </p>
          ) : null}
          <BookingSocialLinks
            instagramUrl={instagramUrl}
            facebookUrl={facebookUrl}
            websiteUrl={websiteUrl}
          />

          <div className="mt-4 w-full border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground">
              {copy.chooseServiceAndTime}
              <span className="ml-2 text-foreground/60">· {services.length} services</span>
            </p>
          </div>
        </header>

        <Separator className="bg-border/50" />

        {gallery.filter((url) => url && url !== heroImageUrl).length > 0 ? (
          <BookingGalleryStrip
            urls={gallery.filter((url) => url && url !== heroImageUrl)}
            businessName={businessName}
          />
        ) : null}

        {showSearch ? (
          <div className="px-4 pt-3 md:px-6">
            <BookingServiceSearch
              query={query}
              onQueryChange={setQuery}
              placeholder={copy.searchServices}
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              allCategoriesLabel={copy.allCategories}
              resultCount={filteredServices.length}
              totalCount={services.length}
              showingLabel={showingLabel}
            />
          </div>
        ) : null}

        <ul
          id="hub-services"
          className="flex flex-col gap-2.5 px-4 py-3 md:gap-2.5 md:px-6 md:pb-4"
        >
          {filteredServices.length === 0 ? (
            <li className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
              {copy.noServicesMatch}
            </li>
          ) : listWindow.mode === "grouped" && listWindow.groupedServices ? (
            listWindow.groupedServices.map((group) => (
              <li key={group.category} className="space-y-2.5">
                <h2 className="sticky top-0 z-10 -mx-1 booking-panel-surface px-1 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.category}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {group.services.map((service) => renderHubService(service as BookingService))}
                </ul>
              </li>
            ))
          ) : (
            (listWindow.flatServices ?? []).map((service) =>
              renderHubService(service as BookingService),
            )
          )}
        </ul>

        {filteredServices.length > 0 ? (
          <div className="px-4 pb-2 md:px-6">
            <BookingServiceListFooter
              copy={copy}
              showMore={listWindow.showMore}
              remaining={listWindow.remaining}
              onShowMore={listWindow.onShowMore}
              usePagination={listWindow.usePagination}
              searchPage={listWindow.searchPage}
              totalPages={listWindow.totalPages}
              onSearchPageChange={listWindow.onSearchPageChange}
            />
          </div>
        ) : null}

        {(cancellationPolicy || depositPolicy || bankTransferInstructions) && (
          <>
            <Separator className="bg-border/50" />
            <div className="px-4 pb-2 md:px-6 md:pb-3">
              <BookingPolicyAccordion
                copy={copy}
                cancellationPolicy={cancellationPolicy}
                depositPolicy={depositPolicy}
                bankTransferInstructions={bankTransferInstructions}
                variant="embedded"
              />
            </div>
          </>
        )}

        <div className="sr-only">
          <Link href={primaryHref}>{copy.chooseService}</Link>
        </div>
        </div>
      </article>

      {showStickyCta ? (
        <BookingHubCta
          businessSlug={businessSlug}
          serviceSlug={primaryService.slug ?? primaryService.id}
          label={primaryCtaLabel}
          variant="sticky"
          emphasis={showStickyBrowse ? "secondary" : "primary"}
          scrollToId={showStickyBrowse ? "hub-services" : undefined}
          onSelect={
            onSelectService && !showStickyBrowse
              ? () => onSelectService(primaryService)
              : undefined
          }
        />
      ) : null}
    </BlurFade>
  );
}
