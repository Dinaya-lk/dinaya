"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { format, parseISO } from "date-fns";
import type { Staff } from "@/db/schema";
import type { Location } from "@/db/schema";
import type { BookingBusiness, BookingService } from "./BookingWizard";
import type { BookingCopy } from "@/lib/i18n";
import type { DealListItem } from "@/lib/deals/queries";
import type { ServicePriceVariant } from "@/lib/service-variants";
import { formatLkr } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { bookingPanelMotion } from "@/lib/booking/booking-motion";
import StepLocation from "./StepLocation";
import { computeDiscountedPrice } from "@/lib/deals/pricing";
import { BusinessRating, getBusinessRating } from "./BusinessRating";
import { BookingServicePrice } from "./BookingServicePrice";
import { cn } from "@/lib/utils";

interface ServiceMetaPanelProps {
  business: BookingBusiness;
  service: BookingService | null;
  staff: Staff | null;
  anyStaff: boolean;
  locations: Pick<Location, "id" | "name" | "address">[];
  needsLocationPicker: boolean;
  selectedLocation: Pick<Location, "id" | "name" | "address"> | null;
  needsStaffPicker: boolean;
  selectedDate: string;
  timeLabel: string;
  holdLabel: string | null;
  slotUnavailable: boolean;
  selectedDeal: DealListItem | null;
  copy: BookingCopy;
  lockServiceSelection: boolean;
  avgRating?: number | null;
  reviewCount?: number;
  priceVariant?: ServicePriceVariant | null;
  needsVariantPicker?: boolean;
  onChangeStaff?: () => void;
  onChangeVariant?: () => void;
  onSelectLocation: (location: Pick<Location, "id" | "name" | "address">) => void;
  onChangeService?: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function ServiceMetaPanel({
  business,
  service,
  staff,
  anyStaff,
  locations,
  needsLocationPicker,
  selectedLocation,
  needsStaffPicker,
  selectedDate,
  timeLabel,
  holdLabel,
  slotUnavailable,
  selectedDeal,
  copy,
  lockServiceSelection,
  avgRating,
  reviewCount,
  priceVariant = null,
  needsVariantPicker = false,
  onChangeStaff,
  onChangeVariant,
  onSelectLocation,
  onChangeService,
}: ServiceMetaPanelProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const serviceMotion = bookingPanelMotion(reduceMotion, !lockServiceSelection);
  const dateLabel = selectedDate
    ? format(parseISO(selectedDate + "T12:00:00"), "EEE, d MMM yyyy")
    : null;

  const effectivePriceLkr = priceVariant?.priceLkr ?? service?.priceLkr ?? 0;
  const price =
    service && selectedDeal && effectivePriceLkr > 0
      ? computeDiscountedPrice(effectivePriceLkr, selectedDeal.discountPercent)
      : effectivePriceLkr;

  const staffLabel = staff && staff.name !== business.name ? staff.name : null;
  const rating = getBusinessRating(avgRating, reviewCount);

  const durationPrice = service ? (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Icon name="clock" className="size-3.5 shrink-0" />
        {formatDuration(service.durationMinutes)}
      </span>
      <span aria-hidden className="text-muted-foreground/50">
        ·
      </span>
      <BookingServicePrice
        priceLkr={effectivePriceLkr}
        displayPrice={selectedDeal && effectivePriceLkr > 0 ? price : undefined}
      />
    </div>
  ) : null;

  return (
    <div className="flex min-w-0 flex-col">
      {/* Mobile compact strip — v2: logo + service + price; date picker is the hero */}
      {service ? (
        <div className="md:hidden">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 shrink-0" data-size="lg">
              {business.logoUrl ? (
                <AvatarImage
                  src={business.logoUrl}
                  alt=""
                  className="bg-white object-contain p-0.5"
                />
              ) : null}
              <AvatarFallback className="booking-bg-accent-muted text-xs font-semibold booking-text-accent">
                {business.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-cal text-lg leading-tight tracking-tight text-foreground">
                {service.name}
              </h2>
              <div className="mt-1">{durationPrice}</div>
            </div>
          </div>

          {needsLocationPicker ? (
            <div className="mt-4">
              <StepLocation
                locations={locations}
                selected={selectedLocation}
                copy={copy}
                onSelect={onSelectLocation}
              />
            </div>
          ) : null}

          {holdLabel && timeLabel ? (
            <p className="mt-3 rounded-lg booking-bg-accent-muted px-3 py-2.5 text-xs font-medium booking-text-accent">
              <Icon name="clock" className="mr-1.5" />
              {holdLabel}
            </p>
          ) : null}

          {slotUnavailable ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-medium">{copy.slotTaken}</p>
              <p className="mt-0.5">{copy.slotTakenAction}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Desktop / tablet full meta column */}
      <div className={cn(service ? "hidden md:block" : "block")}>
        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0" data-size="lg">
            {business.logoUrl ? (
              <AvatarImage
                src={business.logoUrl}
                alt={business.name}
                className="bg-white object-contain p-0.5"
              />
            ) : null}
            <AvatarFallback className="booking-bg-accent-muted text-sm font-semibold booking-text-accent">
              {business.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{business.name}</p>
            {rating ? (
              <BusinessRating
                avgRating={rating.avgRating}
                reviewCount={rating.reviewCount}
                copy={copy}
                size="sm"
                className="mt-1.5"
              />
            ) : null}
          </div>
        </div>

        {needsLocationPicker ? (
          <div className="mt-6">
            <StepLocation
              locations={locations}
              selected={selectedLocation}
              copy={copy}
              onSelect={onSelectLocation}
            />
          </div>
        ) : null}

        <AnimatePresence>
          {service ? (
            <m.div
              key="service-info"
              {...serviceMotion}
              className="mt-4 min-w-0 border-t border-border/70 pt-3"
            >
              {!lockServiceSelection && onChangeService ? (
                <button
                  type="button"
                  onClick={onChangeService}
                  className="mb-3 flex min-h-11 items-center gap-1 text-xs booking-text-accent hover:underline"
                >
                  <Icon name="chevron-left" className="text-[10px]" />
                  {copy.back}
                </button>
              ) : null}
              <h2 className="font-cal text-2xl leading-tight tracking-tight text-foreground">
                {service.name}
              </h2>
              {service.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              ) : null}
              <div className="mt-3">{durationPrice}</div>
              {priceVariant ? (
                <div className="mt-2 flex items-start justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{priceVariant.label}</p>
                  {onChangeVariant && needsVariantPicker ? (
                    <button
                      type="button"
                      onClick={onChangeVariant}
                      className="shrink-0 text-xs font-medium booking-text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--booking-accent-soft) focus-visible:ring-offset-2"
                    >
                      {copy.changeOption}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {(staffLabel || anyStaff) && (
                <div className="mt-3 flex items-start justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <Icon name={anyStaff ? "people" : "person"} className="shrink-0 text-base" />
                    <span className="text-foreground">
                      {anyStaff ? copy.anyAvailableStaff : staffLabel}
                    </span>
                  </p>
                  {onChangeStaff && needsStaffPicker ? (
                    <button
                      type="button"
                      onClick={onChangeStaff}
                      className="shrink-0 text-xs font-medium booking-text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--booking-accent-soft) focus-visible:ring-offset-2"
                    >
                      {copy.changeStaff}
                    </button>
                  ) : null}
                </div>
              )}
              {service.depositPercent > 0 && effectivePriceLkr > 0 ? (
                <p className="mt-3 text-xs font-medium text-foreground">
                  <span className="text-muted-foreground">{copy.depositDue}: </span>
                  <span className="booking-text-accent">
                    {formatLkr(Math.ceil((price * service.depositPercent) / 100))}
                  </span>
                </p>
              ) : null}
            </m.div>
          ) : null}
        </AnimatePresence>

        {service && !staff && !anyStaff && !needsStaffPicker ? (
          <p className="mt-3 text-center text-sm text-amber-600">{copy.noStaff}</p>
        ) : null}

        {service && timeLabel ? (
          <div className="mt-6 border-t border-border/70 pt-4">
            <div className="space-y-2 text-sm">
              {dateLabel ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon name="calendar3" className="size-3.5 shrink-0" />
                  <span className="text-foreground">{dateLabel}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="clock" className="size-3.5 shrink-0 booking-text-accent" />
                <span className="font-medium text-foreground">{timeLabel}</span>
              </div>
            </div>
          </div>
        ) : null}

        <AnimatePresence>
          {holdLabel && dateLabel && timeLabel ? (
            <m.div
              key="selected-time"
              {...bookingPanelMotion(reduceMotion, true)}
              className="mt-4 rounded-lg booking-bg-accent-muted px-3 py-2"
            >
              <p className="text-xs font-medium booking-text-accent">
                <Icon name="clock" className="mr-1.5" />
                {holdLabel}
              </p>
            </m.div>
          ) : null}
        </AnimatePresence>

        {slotUnavailable ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">{copy.slotTaken}</p>
            <p className="mt-0.5">{copy.slotTakenAction}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
