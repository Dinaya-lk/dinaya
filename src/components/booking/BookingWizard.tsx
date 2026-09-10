"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Location, Staff } from "@/db/schema";
import type { IntakeQuestion } from "@/lib/intake";
import type { ServicePriceVariant } from "@/lib/service-variants";
import type { BookingRouter } from "@/lib/booking-router";
import StepService from "./StepService";
import StepLocation from "./StepLocation";
import StepVariant from "./StepVariant";
import StepStaff from "./StepStaff";
import StepDateTime from "./StepDateTime";
import StepConfirm from "./StepConfirm";
import { resolveBookingTheme, type ResolvedBookingTheme } from "@/lib/booking-theme";
import { BookingTheme } from "./BookingTheme";
import { useBookingUrlState, useBookingUrlSync, useStripBookingContactFromUrl, type BookingUrlState } from "./useBookingUrlState";
import { useSlotHold } from "./useSlotHold";
import { getBookingCopy, formatBookingCopy } from "@/lib/i18n";
import { getEligibleStaff, resolveBookingStaffSelection } from "@/lib/booking-staff";
import { trackBookingStart } from "@/lib/analytics/gtag";
import { ServiceMetaPanel } from "./ServiceMetaPanel";
import { BookingWizardSkeleton } from "./BookingWizardSkeleton";
import BookingBranding from "./BookingBranding";
import { BookingChoiceSummary } from "./BookingChoiceSummary";
import { BookingBreadcrumb } from "./BookingBreadcrumb";
import { BookingThemeToggle } from "./BookingThemeToggle";
import { BookingPanel } from "./BookingPanel";
import { buildBookingBreadcrumbItems } from "./booking-breadcrumb";
import { bookingPanelMotion } from "@/lib/booking/booking-motion";
import { cn } from "@/lib/utils";
import {
  BookingMainStepTransition,
  BookingStepTransition,
  type WizardStep,
} from "./BookingStepTransition";
import { BookingTeamSection } from "./BookingTeamSection";
import { BookingAttributionCapture } from "./BookingAttributionCapture";
import { BookingDealsSection } from "./BookingDealsSection";
import type { DealListItem } from "@/lib/deals/queries";
import { useBookingContactStorage } from "./useBookingContactStorage";
import { useEmbedContactPrefill } from "./useEmbedContactPrefill";
import {
  applyEmbedThemeFromQuery,
  createBookingCompletedEmbedEvent,
  postEmbedEvent,
} from "./embed-events";
import {
  useGoogleCalendarOverlay,
  type CalendarOverlayConfig,
} from "./useGoogleCalendarOverlay";
import { shouldShowBookingContactForm } from "@/lib/booking/wizard-contact-step";
import { useBookingInstantUrlSync } from "@/lib/booking/use-booking-instant-url-sync";

const COLOMBO_TZ = "Asia/Colombo";

interface Props {
  business: BookingBusiness;
  services: BookingService[];
  staff: Staff[];
  staffServiceMap: { staffId: string; serviceId: string }[];
  staffLocationMap: { staffId: string; locationId: string }[];
  locations: Pick<Location, "id" | "name" | "address">[];
  businessIcon?: string | null;
  showBranding?: boolean;
  activeDeals?: DealListItem[];
  initialDealId?: string | null;
  bookingRouter?: BookingRouter | null;
  initialService?: BookingService | null;
  lockServiceSelection?: boolean;
  embedMode?: boolean;
  calendarOverlayConfig?: CalendarOverlayConfig | null;
  avgRating?: number | null;
  reviewCount?: number;
  businessDescription?: string | null;
  teamMembers?: Pick<Staff, "id" | "name" | "bio" | "avatarUrl">[];
  hubHref?: string | null;
  onBackToHub?: () => void;
  bookingTheme?: ResolvedBookingTheme;
  /** Hub instant navigation — skip Suspense while search params hydrate. */
  instantNav?: boolean;
  /** Center the white card in the viewport; breadcrumb stays above. */
  centeredBookerLayout?: boolean;
}

export type BookingBusiness = {
  id: string;
  accentColor?: string | null;
  timezone?: string | null;
  bankTransferInstructions?: string | null;
  cancellationPolicy?: string | null;
  depositPolicy?: string | null;
  language?: string;
  lankaqrImageUrl?: string | null;
  name: string;
  payhereEnabled?: boolean;
  paypalEnabled?: boolean;
  slug: string;
  logoUrl?: string | null;
  hideBranding?: boolean;
};

export type BookingService = {
  id: string;
  slug?: string;
  imageUrl?: string | null;
  afterBuffer: number;
  beforeBuffer: number;
  businessId: string;
  createdAt: Date;
  dailyCapacity: number | null;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  minimumNoticeHours: number;
  maximumAdvanceDays: number | null;
  name: string;
  priceLkr: number;
  requiresPayment: boolean;
  depositPercent: number;
  intakeQuestions: IntakeQuestion[];
  priceVariants: ServicePriceVariant[];
  categoryId?: string | null;
  categoryName?: string | null;
};

export type BookingState = {
  location: Pick<Location, "id" | "name" | "address"> | null;
  service: BookingService | null;
  priceVariantId: string | null;
  staff: Staff | null;
  date: string;
  timeSlot: string;
  timeSlotEnd: string;
  timeLabel: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
  intakeAnswers: Record<string, string>;
};

type SlotData = { startUtc: string; endUtc: string; label: string; staffId?: string };

const EMPTY_BOOKING_URL_STATE = {};

type BookingWizardInnerProps = Props & {
  urlState: BookingUrlState;
  setUrlParams: (updates: Partial<BookingUrlState>, options?: { replace?: boolean }) => void;
};

function BookingWizardWithUrl(props: Props) {
  const { state: urlState, setParams } = useBookingUrlState();
  useStripBookingContactFromUrl();
  return <BookingWizardInner {...props} urlState={urlState} setUrlParams={setParams} instantNav={false} />;
}

function BookingWizardInner({
  business,
  services,
  staff,
  staffServiceMap,
  staffLocationMap,
  locations,
  showBranding = true,
  activeDeals = [],
  initialDealId = null,
  bookingRouter = null,
  initialService = null,
  lockServiceSelection = false,
  embedMode = false,
  calendarOverlayConfig = null,
  avgRating,
  reviewCount,
  teamMembers = [],
  hubHref = null,
  onBackToHub,
  bookingTheme,
  instantNav = false,
  centeredBookerLayout = false,
  urlState,
  setUrlParams,
}: BookingWizardInnerProps) {
  const theme =
    bookingTheme ??
    resolveBookingTheme({
      accentColor: business.accentColor,
    });
  const copy = getBookingCopy(business.language);
  const router = useRouter();
  const timezone = business.timezone ?? COLOMBO_TZ;
  const needsLocationPicker = locations.length > 1;
  const defaultLocation = locations.length === 1 ? locations[0]! : null;
  const todayStr = format(toZonedTime(new Date(), timezone), "yyyy-MM-dd");

  const [state, setState] = useState<BookingState>(() => {
    const preselected = initialService ?? null;
    const staffSelection = preselected
      ? resolveBookingStaffSelection(
          staff,
          staffServiceMap,
          preselected.id,
          staffLocationMap,
          defaultLocation?.id,
        )
      : { staff: null as Staff | null, anyStaff: false, eligibleCount: 0 };
    const matchedStaff = urlState.staffId
      ? staff.find((s) => s.id === urlState.staffId) ?? staffSelection.staff
      : staffSelection.staff;
    const matchedPriceVariantId =
      urlState.variantId && preselected?.priceVariants?.some((v) => v.id === urlState.variantId)
        ? urlState.variantId
        : null;

    return {
      location: defaultLocation,
      service: preselected,
      priceVariantId: matchedPriceVariantId,
      staff: matchedStaff,
      date: urlState.date || todayStr,
      timeSlot: urlState.slot || "",
      timeSlotEnd: "",
      timeLabel: "",
      clientName: urlState.name || "",
      clientPhone: urlState.phone || "",
      clientEmail: urlState.email || "",
      notes: "",
      intakeAnswers: {},
    };
  });

  const [anyStaff, setAnyStaff] = useState(() => {
    if (!initialService) return false;
    const selection = resolveBookingStaffSelection(
      staff,
      staffServiceMap,
      initialService.id,
      staffLocationMap,
      defaultLocation?.id,
    );
    return selection.anyStaff;
  });

  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(
    initialDealId ?? urlState.dealId ?? null,
  );

  const [calendarViewMonth, setCalendarViewMonth] = useState(() =>
    format(toZonedTime(new Date(), timezone), "yyyy-MM"),
  );
  const calendarOverlay = useGoogleCalendarOverlay({
    config: embedMode ? null : calendarOverlayConfig,
    selectedDate: state.date,
    viewMonth: calendarViewMonth,
    timezone,
  });

  const slotHold = useSlotHold({
    businessId: business.id,
    serviceId: state.service?.id ?? null,
    staffId: state.staff?.id ?? null,
    locationId: state.location?.id ?? null,
    enabled: true,
    formatHoldLabel: (minutes, seconds) =>
      formatBookingCopy(copy.slotHoldActive, {
        time: `${minutes}:${String(seconds).padStart(2, "0")}`,
      }),
  });

  useBookingUrlSync({
    date: state.date,
    slotStartUtc: state.timeSlot,
    staffId: state.staff?.id ?? null,
    variantId: state.priceVariantId,
    dealId: selectedDealId,
    enabled: !embedMode && !instantNav,
    setParams: setUrlParams,
  });

  useBookingInstantUrlSync({
    date: state.date,
    slotStartUtc: state.timeSlot,
    staffId: state.staff?.id ?? null,
    variantId: state.priceVariantId,
    dealId: selectedDealId,
    enabled: instantNav && !embedMode,
  });

  const applyEmbedPrefill = useCallback((contact: { name?: string; email?: string; phone?: string }) => {
    setState((s) => ({
      ...s,
      clientName: contact.name?.trim() || s.clientName,
      clientEmail: contact.email?.trim() || s.clientEmail,
      clientPhone: contact.phone?.trim() || s.clientPhone,
    }));
  }, []);

  useEmbedContactPrefill(embedMode, applyEmbedPrefill);

  useEffect(() => {
    if (!embedMode) return;
    applyEmbedThemeFromQuery();
    postEmbedEvent({ type: "dinaya:ready", slug: business.slug });
  }, [business.slug, embedMode]);

  useEffect(() => {
    if (!embedMode || !state.service) return;
    postEmbedEvent({
      type: "dinaya:booking_started",
      slug: business.slug,
      serviceId: state.service.id,
    });
  }, [business.slug, embedMode, state.service]);

  const selectedDeal = useMemo(
    () => activeDeals.find((deal) => deal.id === selectedDealId) ?? null,
    [activeDeals, selectedDealId],
  );

  const handleConfirmed = useCallback(
    (data: {
      bookingId: string;
      manualPayment?: boolean;
      payhereFormData?: Record<string, string>;
      payhereUrl?: string;
      approvalUrl?: string;
      provider?: string;
      status?: string;
    }) => {
      void slotHold.releaseHold();
      if (data.payhereUrl || data.approvalUrl || data.provider === "paypal" || data.provider === "payhere") {
        router.push(`/book/${business.slug}/pay?bookingId=${data.bookingId}`);
        return;
      }
      if (embedMode) {
        postEmbedEvent(createBookingCompletedEmbedEvent(business.slug, data.status));
      }
      router.push(`/book/${business.slug}/confirmed?bookingId=${data.bookingId}`);
    },
    [business.slug, router, slotHold, embedMode],
  );

  const bookingStartedRef = useRef(false);
  const markBookingStart = useCallback(
    (isDeal: boolean, serviceId?: string) => {
      if (bookingStartedRef.current) return;
      bookingStartedRef.current = true;
      trackBookingStart({ businessSlug: business.slug, serviceId, isDeal });
    },
    [business.slug],
  );

  const needsStaffPicker = useMemo(() => {
    if (!state.service) return false;
    return getEligibleStaff(staff, staffServiceMap, state.service.id, staffLocationMap, state.location?.id).length > 1;
  }, [state.service, state.location?.id, staff, staffServiceMap, staffLocationMap]);

  const eligibleStaffCount = useMemo(() => {
    if (!state.service) return 0;
    return getEligibleStaff(
      staff,
      staffServiceMap,
      state.service.id,
      staffLocationMap,
      state.location?.id,
    ).length;
  }, [state.service, state.location?.id, staff, staffServiceMap, staffLocationMap]);

  function update(partial: Partial<BookingState>) {
    setState((s) => ({ ...s, ...partial }));
  }

  const contactFields = useMemo(
    () => ({
      clientName: state.clientName,
      clientPhone: state.clientPhone,
      clientEmail: state.clientEmail,
    }),
    [state.clientName, state.clientPhone, state.clientEmail],
  );

  useBookingContactStorage(business.id, contactFields, (restored) => {
    update({
      clientName: restored.clientName ?? state.clientName,
      clientPhone: restored.clientPhone ?? state.clientPhone,
      clientEmail: restored.clientEmail ?? state.clientEmail,
    });
  });

  const selectSlot = useCallback(
    async (slot: SlotData) => {
      const holdSlot = { ...slot, staffId: slot.staffId ?? state.staff?.id };
      const ok = await slotHold.reserveSlot(holdSlot);
      if (!ok) {
        setSelectedSlot(null);
        setState((s) => ({ ...s, timeSlot: "", timeSlotEnd: "", timeLabel: "" }));
        return;
      }
      const assignedStaff =
        slot.staffId ? staff.find((member) => member.id === slot.staffId) ?? state.staff : state.staff;
      setSelectedSlot(slot);
      setAnyStaff(false);
      setState((s) => ({
        ...s,
        staff: assignedStaff ?? s.staff,
        timeSlot: slot.startUtc,
        timeSlotEnd: slot.endUtc,
        timeLabel: slot.label,
      }));
      requestAnimationFrame(() => {
        document.getElementById("booking-contact-form")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    },
    [slotHold, staff, state.staff, setSelectedSlot, setAnyStaff],
  );

  const selectService = useCallback(
    (service: BookingService) => {
      markBookingStart(false, service.id);
      const staffSelection = resolveBookingStaffSelection(
        staff,
        staffServiceMap,
        service.id,
        staffLocationMap,
        state.location?.id,
      );
      update({
        service,
        priceVariantId: null,
        staff: staffSelection.staff,
        date: todayStr,
        timeSlot: "",
        timeSlotEnd: "",
        timeLabel: "",
      });
      setSelectedSlot(null);
      setAnyStaff(staffSelection.anyStaff);
      void slotHold.releaseHold();
      setSelectedDealId(null);
    },
    [staff, staffServiceMap, staffLocationMap, state.location?.id, todayStr, slotHold, markBookingStart],
  );

  const applyDeal = useCallback(
    (deal: DealListItem | null) => {
      setSelectedDealId(deal?.id ?? null);
      if (!deal) return;
      markBookingStart(true, deal.serviceId);

      const service = services.find((item) => item.id === deal.serviceId) ?? null;
      const location = locations.find((item) => item.id === deal.locationId) ?? state.location;
      const eligibleStaff = service
        ? getEligibleStaff(staff, staffServiceMap, service.id, staffLocationMap, location?.id)
        : [];
      const staffSelection = deal.staffId
        ? {
            staff: eligibleStaff.find((member) => member.id === deal.staffId) ?? null,
            anyStaff: false,
          }
        : resolveBookingStaffSelection(
            staff,
            staffServiceMap,
            deal.serviceId,
            staffLocationMap,
            location?.id,
          );

      update({
        location: location ?? null,
        service,
        priceVariantId: null,
        staff: staffSelection.staff,
        date: todayStr,
        timeSlot: "",
        timeSlotEnd: "",
        timeLabel: "",
      });
      setSelectedSlot(null);
      setAnyStaff(staffSelection.anyStaff);
      void slotHold.releaseHold();
    },
    [locations, services, staff, staffServiceMap, staffLocationMap, state.location, todayStr, slotHold, markBookingStart],
  );

  useEffect(() => {
    if (!initialDealId || activeDeals.length === 0) return;
    const deal = activeDeals.find((item) => item.id === initialDealId);
    if (deal) applyDeal(deal);
  }, [initialDealId, activeDeals, applyDeal]);

  useEffect(() => {
    if (!initialService || !lockServiceSelection) return;
    if (state.service?.id === initialService.id) return;
    selectService(initialService);
  }, [initialService, lockServiceSelection, state.service?.id, selectService]);

  const clearSlot = useCallback(() => {
    update({ timeSlot: "", timeSlotEnd: "", timeLabel: "" });
    setSelectedSlot(null);
    void slotHold.releaseHold();
  }, [slotHold]);

  const clearService = useCallback(() => {
    clearSlot();
    update({ service: null, priceVariantId: null, staff: null });
    setAnyStaff(false);
    setSelectedDealId(null);
    void slotHold.releaseHold();
  }, [clearSlot, slotHold]);

  const clearStaffSelection = useCallback(() => {
    clearSlot();
    setAnyStaff(false);
    update({ staff: null });
  }, [clearSlot]);

  const selectedPriceVariant = useMemo(
    () => state.service?.priceVariants?.find((v) => v.id === state.priceVariantId) ?? null,
    [state.service, state.priceVariantId],
  );
  const needsVariantPicker = Boolean(state.service?.priceVariants?.length);
  const showVariantStep = Boolean(state.service && needsVariantPicker && !state.priceVariantId);

  const selectPriceVariant = useCallback((variant: ServicePriceVariant) => {
    update({ priceVariantId: variant.id });
  }, []);

  const clearPriceVariant = useCallback(() => {
    clearSlot();
    update({ priceVariantId: null });
  }, [clearSlot]);

  useEffect(() => {
    if (state.timeSlot && !state.timeLabel) {
      clearSlot();
    }
  }, [state.timeSlot, state.timeLabel, clearSlot]);

  const showContactForm = shouldShowBookingContactForm({
    selectedSlot,
    timeLabel: state.timeLabel,
    staff: state.staff,
    anyStaff,
    needsLocationPicker,
    location: state.location,
  });

  const showStaffStep = Boolean(
    state.service &&
      !showVariantStep &&
      needsStaffPicker &&
      !state.staff &&
      !anyStaff &&
      !showContactForm,
  );

  const canPickSlots = Boolean(
    state.service &&
      !showVariantStep &&
      eligibleStaffCount > 0 &&
      (state.staff || anyStaff || !needsStaffPicker),
  );

  const staffSummaryLabel = anyStaff
    ? copy.anyAvailableStaff
    : state.staff && state.staff.name !== business.name
      ? state.staff.name
      : null;

  const metaPanelProps = {
    business,
    service: state.service,
    staff: state.staff,
    anyStaff,
    locations,
    needsLocationPicker,
    selectedLocation: state.location,
    needsStaffPicker,
    selectedDate: state.date,
    timeLabel: state.timeLabel,
    holdLabel: state.timeLabel ? slotHold.holdLabel : null,
    slotUnavailable: slotHold.slotUnavailable,
    selectedDeal,
    copy,
    lockServiceSelection,
    avgRating,
    reviewCount,
    priceVariant: selectedPriceVariant,
    needsVariantPicker,
    onChangeStaff: needsStaffPicker && !showStaffStep ? clearStaffSelection : undefined,
    onChangeVariant: needsVariantPicker && !showVariantStep ? clearPriceVariant : undefined,
    onSelectLocation: (location: Pick<Location, "id" | "name" | "address">) => {
      clearSlot();
      setAnyStaff(false);
      update({ location, staff: null });
    },
    onChangeService: !lockServiceSelection && !hubHref ? clearService : undefined,
  };

  const showBreadcrumb =
    !embedMode &&
    Boolean(state.service) &&
    (Boolean(hubHref) || Boolean(onBackToHub) || (!lockServiceSelection && services.length > 1));

  const breadcrumbItems = state.service
    ? buildBookingBreadcrumbItems({
        copy,
        service: state.service,
        showContactForm,
        showStaffStep,
        needsStaffPicker,
        showVariantStep,
        needsVariantPicker,
        hubHref,
        onBackToHub,
        lockServiceSelection,
        multiService: services.length > 1,
        onBackToServices: clearService,
        onBackToVariant: clearPriceVariant,
        onBackToStaff: clearStaffSelection,
        onBackToDateTime: clearSlot,
      })
    : [];

  const choiceDateLabel = state.date
    ? format(parseISO(state.date + "T12:00:00"), "EEE d MMM")
    : null;

  const reduceMotion = useReducedMotion() ?? false;
  const panelMotion = bookingPanelMotion(reduceMotion, !instantNav);

  const wizardStep: WizardStep = !state.service
    ? "service"
    : showVariantStep
      ? "variant"
      : showStaffStep
        ? "staff"
        : "dateTime";

  const accentPanel = theme.panelBackground === "accent";

  // Signal page-level fixed theme toggle to hide on mobile — chrome row owns it.
  useEffect(() => {
    if (!showBreadcrumb) return;
    document.documentElement.dataset.bookingChrome = "1";
    return () => {
      delete document.documentElement.dataset.bookingChrome;
    };
  }, [showBreadcrumb]);

  const renderBreadcrumbChrome = () =>
    showBreadcrumb ? (
      <div
        className={cn(
          // Padding on the outer shell only — keep min-h / items-center on the inner row
          // so the 44px theme control and crumb text share one baseline.
          "w-full px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3",
          "md:mb-4 md:px-0 md:pb-0 md:pt-0",
        )}
      >
        <div className="flex min-h-11 items-center gap-3">
          <div className="min-w-0 flex-1">
            <BookingBreadcrumb items={breadcrumbItems} />
          </div>
          <BookingThemeToggle inline className="md:hidden" />
        </div>
      </div>
    ) : null;

  const bookerCard = (
      <div className="w-full min-w-0 max-w-full booking-panel-surface rounded-none border-x-0 shadow-none lg:overflow-visible lg:rounded-xl lg:border lg:border-border lg:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] dark:lg:shadow-none dark:lg:ring-1 dark:lg:ring-white/10">
        {/* Mobile breadcrumb chrome — first in the panel so top padding is intentional */}
        {showBreadcrumb ? <div className="md:hidden">{renderBreadcrumbChrome()}</div> : null}

        <BookingAttributionCapture businessId={business.id} />
        <BookingDealsSection
          deals={activeDeals}
          selectedDealId={selectedDealId}
          onSelectDeal={applyDeal}
        />

        <div
          className={cn(
            "px-4 md:px-0 md:py-0",
            // Avoid stacking py-4 on top of chrome — that made crumbs look flush and meta far below.
            showBreadcrumb ? "pb-4 pt-1 md:pt-0" : "py-4",
          )}
        >
          <BookingStepTransition step={wizardStep}>
          {!state.service ? (
            <div className="mx-auto w-full max-w-lg">
              {needsLocationPicker && (
                <StepLocation
                  locations={locations}
                  selected={state.location}
                  copy={copy}
                  onSelect={(location) => {
                    update({
                      location,
                      service: null,
                      priceVariantId: null,
                      staff: null,
                      timeSlot: "",
                      timeSlotEnd: "",
                      timeLabel: "",
                    });
                    setSelectedSlot(null);
                    void slotHold.releaseHold();
                  }}
                />
              )}
              <StepService
                services={services}
                selected={state.service}
                copy={copy}
                bookingRouter={bookingRouter}
                onSelect={selectService}
              />
            </div>
          ) : showVariantStep ? (
            <StepVariant
              service={state.service!}
              selectedId={state.priceVariantId}
              copy={copy}
              onSelect={selectPriceVariant}
            />
          ) : showStaffStep ? (
            <StepStaff
              service={state.service!}
              allStaff={staff}
              staffServiceMap={staffServiceMap}
              staffLocationMap={staffLocationMap}
              locationId={state.location?.id}
              selected={state.staff}
              anyStaffSelected={anyStaff}
              copy={copy}
              onSelect={(s) => {
                setAnyStaff(false);
                update({ staff: s });
              }}
              onSelectAny={() => {
                setAnyStaff(true);
                update({ staff: null });
              }}
            />
          ) : (
            <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-0 lg:grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)] lg:items-stretch lg:divide-x lg:divide-border xl:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)]">
              <BookingPanel
                area="meta"
                className="border-b border-border pb-3 pt-0 md:border-0 md:px-5 md:pb-6 md:pt-6 lg:sticky lg:top-0 lg:z-1 lg:self-start xl:px-6"
                {...panelMotion}
              >
                <ServiceMetaPanel {...metaPanelProps} />
              </BookingPanel>

              <BookingPanel area="main" className="relative z-0 min-w-0 lg:py-0" {...panelMotion}>
                {state.service &&
                (showContactForm || Boolean(state.timeLabel) || Boolean(selectedSlot)) ? (
                  <div className="border-b border-border py-3 lg:hidden">
                    <BookingChoiceSummary
                      staffLabel={staffSummaryLabel}
                      dateLabel={choiceDateLabel}
                      timeLabel={state.timeLabel || null}
                      stepLabel={
                        showContactForm
                          ? copy.details
                          : selectedSlot
                            ? copy.details
                            : copy.pickDateTime
                      }
                      holdLabel={state.timeLabel ? slotHold.holdLabel : null}
                      slotUnavailable={slotHold.slotUnavailable}
                      slotTaken={copy.slotTaken}
                      slotTakenAction={copy.slotTakenAction}
                    />
                  </div>
                ) : null}
                {!showContactForm && canPickSlots && !selectedSlot ? (
                  <div className="border-b border-border px-0 pb-3 pt-3 md:hidden">
                    <h2 className="font-cal text-xl tracking-tight text-foreground">
                      {copy.pickDateTime}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.chooseDate}</p>
                  </div>
                ) : null}
                <BookingMainStepTransition stepKey={showContactForm ? "confirm" : "dateTime"}>
                {canPickSlots ? (
                  showContactForm ? (
                    <div className="px-4 py-4 md:px-6 lg:px-8 lg:py-6">
                      <StepConfirm
                        variant="inline"
                        formId="booking-contact-form"
                        onAccentPanel={accentPanel}
                        state={state}
                        business={business}
                        copy={copy}
                        priceVariant={selectedPriceVariant}
                        selectedDeal={selectedDeal}
                        sessionToken={slotHold.sessionToken}
                        slotUnavailable={slotHold.slotUnavailable}
                        onUpdate={update}
                        onBack={clearSlot}
                        onConfirmed={handleConfirmed}
                        hideInlineBack={showBreadcrumb}
                        hideDetailsHeading={showBreadcrumb}
                      />
                    </div>
                  ) : (
                    <div className="px-4 py-4 md:px-6 lg:px-8 lg:py-6">
                      <StepDateTime
                        businessId={business.id}
                        copy={copy}
                        service={state.service}
                        staff={state.staff}
                        anyStaff={anyStaff}
                        locationId={state.location?.id}
                        timezone={timezone}
                        selectedDate={state.date}
                        selectedSlot={selectedSlot}
                        dealId={selectedDealId}
                        holdLabel={state.timeLabel ? slotHold.holdLabel : null}
                        slotUnavailable={slotHold.slotUnavailable}
                        onDateChange={(date) => {
                          clearSlot();
                          update({ date });
                        }}
                        onSlotSelect={selectSlot}
                        onCalendarMonthChange={setCalendarViewMonth}
                        calendarOverlay={calendarOverlay}
                        hideHeading
                      />
                    </div>
                  )
                ) : (
                  <p className="px-4 py-12 text-center text-sm text-amber-600 md:px-6 lg:px-8">
                    {eligibleStaffCount === 0 ? copy.noStaff : copy.chooseTeamToSeeTimes}
                  </p>
                )}
                </BookingMainStepTransition>
              </BookingPanel>
            </div>
          )}
          </BookingStepTransition>
        </div>

        {state.service && teamMembers.length > 0 && !embedMode && !hubHref && !onBackToHub && !showStaffStep && (
          <BookingTeamSection
            members={teamMembers}
            copy={copy}
            variant="dialog"
            className="flex justify-center border-t border-border px-4 py-3"
          />
        )}
      </div>
  );

  const brandingBlock =
    showBranding ? (
      <div className="mt-3 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:mt-4 md:px-0">
        <BookingBranding copy={copy} hideBranding={business.hideBranding} businessSlug={business.slug} />
      </div>
    ) : null;

  // Desktop: breadcrumb sits above the card. Mobile chrome is inside the panel.
  const desktopBreadcrumb =
    showBreadcrumb ? <div className="hidden md:block">{renderBreadcrumbChrome()}</div> : null;

  if (centeredBookerLayout) {
    return (
      <BookingTheme
        theme={theme}
        embed={embedMode}
        className="w-full"
      >
        {desktopBreadcrumb}
        {bookerCard}
        {brandingBlock}
      </BookingTheme>
    );
  }

  return (
    <BookingTheme theme={theme} embed={embedMode}>
      {desktopBreadcrumb}
      {bookerCard}
      {brandingBlock}
    </BookingTheme>
  );
}

export default function BookingWizard(props: Props) {
  if (props.instantNav) {
    return (
      <BookingWizardInner
        {...props}
        urlState={EMPTY_BOOKING_URL_STATE}
        setUrlParams={() => {}}
      />
    );
  }

  return (
    <Suspense fallback={<BookingWizardSkeleton />}>
      <BookingWizardWithUrl {...props} />
    </Suspense>
  );
}
