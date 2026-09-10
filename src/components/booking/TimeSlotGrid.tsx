"use client";

import { parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Icon } from "@/components/ui/Icon";
import type { BookingCopy } from "@/lib/i18n";
import { TimeSlotGridSkeleton } from "./SlotListPanelSkeleton";
import { SlotsEmptyView, type NextAvailableSlot } from "./SlotsEmptyView";
import {
  slotConflictsWithBusyTime,
  type CalendarBusyTime,
} from "@/lib/google-calendar-overlay";

const DEFAULT_TZ = "Asia/Colombo";

export type SlotOption = {
  startUtc: string;
  endUtc: string;
  label: string;
  staffId?: string;
};

type Period = "morning" | "afternoon" | "evening";

function slotPeriod(startUtc: string, timezone: string): Period {
  const hour = toZonedTime(parseISO(startUtc), timezone).getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const PERIOD_ORDER: Period[] = ["morning", "afternoon", "evening"];

const PERIOD_LABEL: Record<Period, keyof Pick<BookingCopy, "morning" | "afternoon" | "evening">> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
};

export type SlotEmptyState = "none" | "closed" | "full" | "capacity";

interface Props {
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

export default function TimeSlotGrid({
  slots,
  selectedStartUtc,
  copy,
  onSelect,
  loading,
  refreshing = false,
  emptyState = "none",
  timezone = DEFAULT_TZ,
  busyTimes = [],
  nextAvailable,
  onNextAvailable,
}: Props) {
  if (loading) {
    return <TimeSlotGridSkeleton label={copy.loadingAvailableTimes} />;
  }

  if (slots.length === 0) {
    return (
      <SlotsEmptyView
        copy={copy}
        emptyState={emptyState}
        nextAvailable={nextAvailable}
        onNextAvailable={onNextAvailable}
        variant="grid"
      />
    );
  }

  const grouped = PERIOD_ORDER.map((period) => ({
    period,
    label: copy[PERIOD_LABEL[period]],
    slots: slots.filter((s) => slotPeriod(s.startUtc, timezone) === period),
  })).filter((g) => g.slots.length > 0);

  return (
    <div
      className={`space-y-5 transition-opacity ${refreshing ? "pointer-events-none opacity-50" : ""}`}
      aria-busy={refreshing || undefined}
    >
      {grouped.map(({ period, label, slots: periodSlots }) => (
        <div key={period}>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="grid grid-cols-2 gap-2.5 min-[400px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3">
            {periodSlots.map((slot) => {
              const isSelected = selectedStartUtc === slot.startUtc;
              const hasCalendarConflict = slotConflictsWithBusyTime(slot, busyTimes);
              return (
                <button
                  key={slot.startUtc}
                  type="button"
                  onClick={() => onSelect(slot)}
                  aria-pressed={isSelected}
                  aria-label={`${slot.label}${isSelected ? ", selected" : ""}${
                    hasCalendarConflict ? `, ${copy.calendarConflict}` : ""
                  }`}
                  className={`flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm font-medium tabular-nums transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100 ${
                    isSelected
                      ? "booking-bg-accent border-transparent text-white booking-shadow-accent"
                      : "border-(--booking-accent-soft) booking-bg-accent-muted text-foreground hover:booking-border-accent hover:booking-bg-accent-soft"
                  }`}
                  title={hasCalendarConflict ? copy.calendarConflict : undefined}
                >
                  {/* Cal.com-style overlay indicator: warning dot when the slot
                      overlaps a personal calendar event, green when free — the
                      slot stays bookable either way. */}
                  {!isSelected && (
                    <span
                      className={`size-2 shrink-0 rounded-full ${
                        hasCalendarConflict ? "bg-amber-500" : "bg-[#00D492]"
                      }`}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 text-center">{slot.label}</span>
                  {isSelected && <Icon name="check" className="shrink-0 text-xs opacity-90" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
