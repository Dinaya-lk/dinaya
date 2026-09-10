"use client";

import { parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Icon } from "@/components/ui/Icon";
import type { BookingCopy } from "@/lib/i18n";
import { SlotListPanelSkeleton } from "./SlotListPanelSkeleton";
import {
  slotConflictsWithBusyTime,
  type CalendarBusyTime,
} from "@/lib/google-calendar-overlay";
import type { SlotEmptyState, SlotOption } from "./TimeSlotGrid";
import { SlotsEmptyView, type NextAvailableSlot } from "./SlotsEmptyView";

const DEFAULT_TZ = "Asia/Colombo";

type Period = "morning" | "afternoon" | "evening";

function slotPeriod(startUtc: string, timezone: string): Period {
  const hour = toZonedTime(parseISO(startUtc), timezone).getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const PERIOD_ORDER: Period[] = ["morning", "afternoon", "evening"];
const PERIOD_LABEL: Record<Period, "morning" | "afternoon" | "evening"> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
};

interface SlotListPanelProps {
  slots: SlotOption[];
  selectedStartUtc: string | null;
  copy: BookingCopy;
  onSelect: (slot: SlotOption) => void;
  loading?: boolean;
  refreshing?: boolean;
  emptyState?: SlotEmptyState;
  timezone?: string;
  busyTimes?: CalendarBusyTime[];
  nextAvailable?: NextAvailableSlot | null;
  onNextAvailable?: (slot: NextAvailableSlot) => void;
}

export function SlotListPanel({
  slots,
  selectedStartUtc,
  copy,
  onSelect,
  loading = false,
  refreshing = false,
  emptyState = "none",
  timezone = DEFAULT_TZ,
  busyTimes = [],
  nextAvailable,
  onNextAvailable,
}: SlotListPanelProps) {
  if (loading) {
    return <SlotListPanelSkeleton label={copy.loadingAvailableTimes} />;
  }

  if (slots.length === 0) {
    return (
      <SlotsEmptyView
        copy={copy}
        emptyState={emptyState}
        nextAvailable={nextAvailable}
        onNextAvailable={onNextAvailable}
        variant="list"
      />
    );
  }

  const byPeriod: Record<Period, SlotOption[]> = { morning: [], afternoon: [], evening: [] };
  for (const slot of slots) {
    byPeriod[slotPeriod(slot.startUtc, timezone)].push(slot);
  }

  return (
    <div
      className={`relative flex flex-col gap-4 transition-opacity ${refreshing ? "pointer-events-none opacity-50" : ""}`}
      aria-busy={refreshing || undefined}
    >
      {PERIOD_ORDER.map((period) => {
        const periodSlots = byPeriod[period];
        if (periodSlots.length === 0) return null;
        return (
          <div key={period}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {copy[PERIOD_LABEL[period]]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {periodSlots.map((slot) => {
                const isSelected = slot.startUtc === selectedStartUtc;
                const hasCalendarConflict = slotConflictsWithBusyTime(slot, busyTimes);
                return (
                  <button
                    key={slot.startUtc}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${slot.label}${
                      hasCalendarConflict ? `, ${copy.calendarConflict}` : ""
                    }`}
                    title={hasCalendarConflict ? copy.calendarConflict : undefined}
                    onClick={() => onSelect(slot)}
                    className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium tabular-nums transition-[transform,background-color,border-color,box-shadow,color] duration-300 ease-out active:scale-[0.96] motion-reduce:active:scale-100 ${
                      isSelected
                        ? "booking-bg-accent border-transparent text-white booking-shadow-accent"
                        : "border-(--booking-accent-soft) booking-bg-accent-muted text-foreground hover:booking-border-accent hover:booking-bg-accent-soft"
                    }`}
                  >
                    {/* Cal.com-style overlay indicator: warning dot when the
                        slot overlaps a personal calendar event, green when
                        free — the slot stays bookable either way. */}
                    {!isSelected && (
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          hasCalendarConflict ? "bg-amber-500" : "bg-[#00D492]"
                        }`}
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 text-center">{slot.label}</span>
                    {isSelected && (
                      <Icon name="check" className="shrink-0 text-[10px] opacity-90" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent"
        aria-hidden
      />
    </div>
  );
}
