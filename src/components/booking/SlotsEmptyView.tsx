"use client";

import { format, parseISO } from "date-fns";
import type { BookingCopy } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { SlotEmptyState } from "./TimeSlotGrid";

export type NextAvailableSlot = {
  date: string;
  startUtc: string;
  endUtc: string;
  label: string;
};

interface SlotsEmptyViewProps {
  copy: BookingCopy;
  emptyState: SlotEmptyState;
  nextAvailable?: NextAvailableSlot | null;
  onNextAvailable?: (slot: NextAvailableSlot) => void;
  variant?: "list" | "grid";
}

function emptyMessage(copy: BookingCopy, emptyState: SlotEmptyState) {
  if (emptyState === "closed") return copy.dayClosed;
  if (emptyState === "capacity") return copy.capacityReached;
  if (emptyState === "full") return copy.dayFull;
  return copy.noSlots;
}

function emptyIcon(emptyState: SlotEmptyState) {
  if (emptyState === "capacity") return "x-circle" as const;
  return "calendar-x" as const;
}

export function SlotsEmptyView({
  copy,
  emptyState,
  nextAvailable,
  onNextAvailable,
  variant = "list",
}: SlotsEmptyViewProps) {
  const message = emptyMessage(copy, emptyState);
  const showNext =
    nextAvailable && onNextAvailable && emptyState !== "none";
  const nextLabel = showNext
    ? `${format(parseISO(nextAvailable.date + "T12:00:00"), "EEE d MMM")} · ${nextAvailable.label}`
    : null;

  const iconBadge = (
    <div className="flex size-12 items-center justify-center rounded-full booking-bg-accent-muted">
      <Icon name={emptyIcon(emptyState)} className="text-xl booking-text-accent" />
    </div>
  );

  const nextAvailableBlock = showNext && nextLabel && (
    <div className={variant === "grid" ? "mt-5 flex flex-col items-center" : "mt-1 w-full"}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {copy.nextAvailable}
      </p>
      <button
        type="button"
        onClick={() => onNextAvailable(nextAvailable)}
        className={cn(
          "flex min-h-11 items-center justify-center rounded-lg booking-bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-(--booking-accent)/90",
          variant === "grid" ? "w-full max-w-xs" : "w-full",
        )}
        aria-label={`${copy.nextAvailable}: ${nextLabel}`}
      >
        {nextLabel}
      </button>
    </div>
  );

  if (variant === "grid") {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-8 text-center">
        <div className="mx-auto mb-3 w-fit">{iconBadge}</div>
        <p className="text-sm font-medium text-foreground/80">{message}</p>
        {nextAvailableBlock}
      </div>
    );
  }

  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-8 text-center">
      {iconBadge}
      <p className="max-w-xs text-sm font-medium leading-relaxed text-foreground/80">{message}</p>
      {nextAvailableBlock}
    </div>
  );
}
