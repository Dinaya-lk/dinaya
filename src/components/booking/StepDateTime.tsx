"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import type { Staff } from "@/db/schema";
import { getBookingSessionToken } from "@/lib/booking-session";
import type { BookingService } from "./BookingWizard";
import type { BookingCopy } from "@/lib/i18n";
import MonthCalendar, { type MonthDayStatus } from "./MonthCalendar";
import DateQuickStrip from "./DateQuickStrip";
import TimeSlotGrid, { type SlotEmptyState, type SlotOption } from "./TimeSlotGrid";
import { SlotListPanel } from "./SlotListPanel";
import type { NextAvailableSlot } from "./SlotsEmptyView";
import { CalendarOverlayControl } from "./CalendarOverlayControl";
import type { GoogleCalendarOverlay } from "./useGoogleCalendarOverlay";

import { ANY_STAFF_ID } from "@/lib/booking-staff";

const DEFAULT_TZ = "Asia/Colombo";
const POLL_MS = 60_000;

interface Props {
  businessId: string;
  copy: BookingCopy;
  service: BookingService | null;
  staff: Staff | null;
  selectedDate: string;
  selectedSlot: SlotOption | null;
  dealId?: string | null;
  locationId?: string | null;
  anyStaff?: boolean;
  timezone?: string;
  holdLabel?: string | null;
  slotUnavailable?: boolean;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: SlotOption) => void;
  showContinue?: boolean;
  onContinue?: () => void;
  onBack?: () => void;
  hideSlots?: boolean;
  onSlotsChange?: (slots: SlotOption[], loading: boolean, emptyState: SlotEmptyState) => void;
  onCalendarMonthChange?: (month: string) => void;
  calendarOverlay?: GoogleCalendarOverlay;
  hideHeading?: boolean;
}

export default function StepDateTime({
  businessId,
  copy,
  service,
  staff,
  selectedDate,
  selectedSlot,
  dealId,
  locationId,
  anyStaff,
  timezone = DEFAULT_TZ,
  holdLabel,
  slotUnavailable,
  onDateChange,
  onSlotSelect,
  showContinue,
  onContinue,
  onBack,
  hideSlots = false,
  onSlotsChange,
  onCalendarMonthChange,
  calendarOverlay,
  hideHeading = false,
}: Props) {
  const today = toZonedTime(new Date(), timezone);
  const maxDate = service?.maximumAdvanceDays
    ? addDays(today, service.maximumAdvanceDays)
    : undefined;
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [slotEmptyState, setSlotEmptyState] = useState<SlotEmptyState>("none");
  const slotCacheRef = useRef<Record<string, { slots: SlotOption[]; emptyState: SlotEmptyState }>>({});
  const [nextAvailable, setNextAvailable] = useState<NextAvailableSlot | null>(null);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);
  const [monthDayStatus, setMonthDayStatus] = useState<Record<string, MonthDayStatus>>({});
  const [calendarMonth, setCalendarMonth] = useState(() => format(today, "yyyy-MM"));
  const autoAdvancedDateRef = useRef(false);

  const canLoad = Boolean(service && (staff || anyStaff));
  const sessionToken = typeof window !== "undefined" ? getBookingSessionToken() : "";

  useEffect(() => {
    slotCacheRef.current = {};
  }, [businessId, service?.id, staff?.id, anyStaff, dealId, locationId]);

  async function loadSlots(date: string) {
    if (!service || (!staff && !anyStaff)) return;

    const cached = slotCacheRef.current[date];
    if (cached) {
      setSlots(cached.slots);
      setSlotEmptyState(cached.emptyState);
      setHasFetched(true);
    }

    setLoadingSlots(true);
    onSlotsChange?.(cached?.slots ?? slots, true, cached?.emptyState ?? slotEmptyState);

    const query = new URLSearchParams({
      businessId,
      staffId: anyStaff ? ANY_STAFF_ID : staff!.id,
      serviceId: service.id,
      date,
    });
    if (locationId) query.set("locationId", locationId);
    if (dealId) query.set("dealId", dealId);
    if (sessionToken) query.set("sessionToken", sessionToken);
    try {
    const res = await fetch(`/api/availability?${query.toString()}`);
    if (!res.ok) {
      setSlotEmptyState("full");
      setSlots([]);
      setLoadingSlots(false);
      setHasFetched(true);
      return;
    }
    const data = await res.json();
    const fetchedSlots: SlotOption[] = data.slots ?? [];
    const fetchedEmptyState: SlotEmptyState =
      data.closed ? "closed" :
      data.capacityReached ? "capacity" :
      fetchedSlots.length === 0 ? "full" :
      "none";

    slotCacheRef.current[date] = { slots: fetchedSlots, emptyState: fetchedEmptyState };
    setSlots(fetchedSlots);
    setSlotEmptyState(fetchedEmptyState);
    setLoadingSlots(false);
    setHasFetched(true);
    onSlotsChange?.(fetchedSlots, false, fetchedEmptyState);
    } catch {
      setSlotEmptyState("full");
      setSlots([]);
      setLoadingSlots(false);
      setHasFetched(true);
    }
  }

  const loadMonthStatus = useCallback(
    async (month: string) => {
      if (!service || (!staff && !anyStaff)) return;
      const query = new URLSearchParams({
        businessId,
        staffId: anyStaff ? ANY_STAFF_ID : staff!.id,
        serviceId: service.id,
        month,
      });
      if (locationId) query.set("locationId", locationId);
      if (dealId) query.set("dealId", dealId);
      if (sessionToken) query.set("sessionToken", sessionToken);
      const res = await fetch(`/api/availability/month?${query.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setMonthDayStatus((prev) => ({ ...prev, ...(data.days ?? {}) }));
    },
    [businessId, dealId, locationId, anyStaff, service, sessionToken, staff],
  );

  useEffect(() => {
    if (!canLoad || !selectedDate) {
      setSlots([]);
      setHasFetched(false);
      setLoadingSlots(false);
      slotCacheRef.current = {};
      return;
    }

    let cancelled = false;
    (async () => {
      await loadSlots(selectedDate);
      if (cancelled) return;
    })();

    const interval = setInterval(() => {
      if (!cancelled) void loadSlots(selectedDate);
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, staff?.id, anyStaff, service?.id, selectedDate, canLoad, dealId, locationId]);

  useEffect(() => {
    if (!canLoad) {
      setNextAvailable(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const query = new URLSearchParams({
        businessId,
        staffId: anyStaff ? ANY_STAFF_ID : staff!.id,
        serviceId: service!.id,
      });
      if (locationId) query.set("locationId", locationId);
      if (sessionToken) query.set("sessionToken", sessionToken);
      const res = await fetch(`/api/availability/next?${query.toString()}`);
      if (!res.ok) {
        if (!cancelled) setNextAvailable(null);
        return;
      }
      const data = await res.json();
      if (!cancelled) setNextAvailable(data.next ?? null);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, staff?.id, service?.id, canLoad]);

  useEffect(() => {
    autoAdvancedDateRef.current = false;
  }, [service?.id, staff?.id]);

  useEffect(() => {
    if (!canLoad || !hasFetched || autoAdvancedDateRef.current) return;
    if (slotEmptyState === "none" || !nextAvailable) return;
    if (nextAvailable.date === selectedDate) return;

    autoAdvancedDateRef.current = true;
    onDateChange(nextAvailable.date);
  }, [canLoad, hasFetched, slotEmptyState, nextAvailable, selectedDate, onDateChange]);

  useEffect(() => {
    if (!canLoad) {
      setMonthDayStatus({});
      return;
    }
    void loadMonthStatus(calendarMonth);
  }, [calendarMonth, canLoad, loadMonthStatus]);

  const handleMonthChange = useCallback(
    (month: string) => {
      setCalendarMonth(month);
      onCalendarMonthChange?.(month);
    },
    [onCalendarMonthChange],
  );

  const handleNextAvailable = useCallback(
    (slot: NextAvailableSlot) => {
      onDateChange(slot.date);
      onSlotSelect({
        startUtc: slot.startUtc,
        endUtc: slot.endUtc,
        label: slot.label,
      });
    },
    [onDateChange, onSlotSelect],
  );

  const compactDateHeading = selectedDate
    ? format(parseISO(selectedDate + "T12:00:00"), "EEE d")
    : null;

  if (!service || (!staff && !anyStaff)) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground md:min-h-[320px]">
        <div>
          <Icon name="calendar2-plus" className="mb-3 block text-3xl text-muted-foreground/50" />
          {copy.selectServiceHint}
        </div>
      </div>
    );
  }

  const showNextAvailable =
    Boolean(
      nextAvailable &&
        nextAvailable.date !== selectedDate &&
        hasFetched &&
        slotEmptyState !== "none",
    );

  const showSlotSkeleton = loadingSlots && slots.length === 0;
  const isRefreshingSlots = loadingSlots && slots.length > 0;

  const slotPanelProps = {
    slots,
    selectedStartUtc: selectedSlot?.startUtc ?? null,
    copy,
    onSelect: onSlotSelect,
    loading: showSlotSkeleton,
    refreshing: isRefreshingSlots,
    emptyState: slotEmptyState,
    timezone,
    busyTimes: calendarOverlay?.busyTimes,
    nextAvailable: showNextAvailable ? nextAvailable : null,
    onNextAvailable: handleNextAvailable,
  };

  return (
      <div className="flex h-full min-w-0 w-full max-w-full flex-col">
      {!hideHeading ? (
        <p className="mb-4 text-sm font-medium text-muted-foreground md:hidden">
          {copy.pickDateTime}
        </p>
      ) : null}

      <div className="flex min-w-0 w-full max-w-full flex-col lg:grid lg:min-h-[24rem] lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.95fr)] lg:divide-x lg:divide-border/80 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.95fr)]">
        <section className="min-w-0 flex-1 py-0 lg:pr-6">
          <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
            {!hideHeading ? (
              <p className="text-sm font-medium text-foreground md:sr-only">{copy.chooseDate}</p>
            ) : (
              <span className="md:hidden" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => setShowMobileCalendar((v) => !v)}
              className="inline-flex min-h-11 items-center text-xs font-medium booking-text-accent md:hidden"
            >
              {showMobileCalendar ? copy.quickDates : copy.fullCalendar}
            </button>
            {/* Cal.com-style placement: inline switch in the picker header on
                desktop; on mobile the same control lives in the slot sheet. */}
            {calendarOverlay && (
              <div className="md:ml-auto">
                <CalendarOverlayControl copy={copy} overlay={calendarOverlay} />
              </div>
            )}
          </div>

          <div className="md:hidden">
            {showMobileCalendar ? (
              <MonthCalendar
                selectedDate={selectedDate}
                minDate={today}
                maxDate={maxDate}
                dayStatus={monthDayStatus}
                nextAvailableDate={showNextAvailable ? nextAvailable?.date : undefined}
                onMonthChange={handleMonthChange}
                onSelect={onDateChange}
                size="comfortable"
              />
            ) : (
              <DateQuickStrip
                selectedDate={selectedDate}
                minDate={today}
                maxDate={maxDate}
                copy={copy}
                onSelect={onDateChange}
              />
            )}
          </div>

          <div className="hidden min-w-0 md:block lg:hidden">
            <MonthCalendar
              selectedDate={selectedDate}
              minDate={today}
              maxDate={maxDate}
              dayStatus={monthDayStatus}
              nextAvailableDate={showNextAvailable ? nextAvailable?.date : undefined}
              onMonthChange={handleMonthChange}
              onSelect={onDateChange}
              size="comfortable"
            />
          </div>

          <div className="hidden min-w-0 lg:block">
            <MonthCalendar
              selectedDate={selectedDate}
              minDate={today}
              maxDate={maxDate}
              dayStatus={monthDayStatus}
              nextAvailableDate={showNextAvailable ? nextAvailable?.date : undefined}
              onMonthChange={handleMonthChange}
              onSelect={onDateChange}
              size="comfortable"
            />
          </div>
        </section>

        {!hideSlots ? (
          <section className="min-w-0 flex-1 border-t border-border/80 py-4 lg:flex lg:min-h-0 lg:flex-col lg:border-t-0 lg:py-0 lg:pl-6">
            {compactDateHeading ? (
                <div className="mb-3 flex items-baseline justify-between gap-2 md:mb-4">
                  <h3 className="text-sm font-semibold text-foreground md:text-base">{compactDateHeading}</h3>
                  <span className="text-xs font-medium text-muted-foreground">{copy.availableTimes}</span>
                </div>
              ) : (
                <p className="mb-3 text-xs text-muted-foreground">{copy.selectDate}</p>
              )}

              {holdLabel && selectedSlot && (
                <p className="mb-3 rounded-lg booking-bg-accent-muted px-3 py-2 text-xs font-medium booking-text-accent">
                  <Icon name="clock" className="mr-1.5" />
                  {holdLabel}
                </p>
              )}

              {slotUnavailable && (
                <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-medium">{copy.slotTaken}</p>
                  <p className="mt-1 text-amber-700/90 dark:text-amber-300/90">{copy.slotTakenAction}</p>
                </div>
              )}

              {!hasFetched && !loadingSlots ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{copy.selectDate}</p>
              ) : (
                <>
                  <div className="lg:hidden">
                    <TimeSlotGrid {...slotPanelProps} />
                  </div>
                  <div className="scrollbar-hide hidden min-w-0 w-full max-h-[min(30rem,calc(100vh-14rem))] overflow-y-auto overflow-x-hidden pb-4 lg:block">
                    <SlotListPanel {...slotPanelProps} />
                  </div>
                </>
              )}
          </section>
        ) : null}
      </div>

      {(onBack || showContinue) && (
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4 md:hidden">
          {onBack && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack} className="px-0">
              <Icon name="chevron-left" />
              {copy.back}
            </Button>
          )}
          {showContinue && selectedSlot && onContinue && (
            <Button
              type="button"
              className="ml-auto min-h-11 bg-[var(--booking-accent)] px-5 text-base text-white hover:bg-[var(--booking-accent)]/90 md:text-sm"
              onClick={onContinue}
            >
              {copy.continue}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
