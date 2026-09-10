"use client";

import { Icon } from "@/components/ui/Icon";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";

export type MonthDayStatus = "available" | "full" | "closed";

interface Props {
  selectedDate: string;
  minDate: Date;
  maxDate?: Date;
  dayStatus?: Record<string, MonthDayStatus>;
  nextAvailableDate?: string;
  onSelect: (dateStr: string) => void;
  onMonthChange?: (month: string) => void;
  /**
   * "comfortable" — large touch targets for the mobile full-calendar sheet.
   * "dense" — tighter desktop sidebar layout; still kept above real touch/
   * readability minimums (not a 1:1 copy of the marketing demo's decorative,
   * much smaller scale, which nobody needs to actually read or tap precisely).
   */
  size?: "dense" | "comfortable";
}

export default function MonthCalendar({
  selectedDate,
  minDate,
  maxDate,
  dayStatus,
  nextAvailableDate,
  onSelect,
  onMonthChange,
  size = "dense",
}: Props) {
  const selected = selectedDate ? new Date(selectedDate + "T12:00:00") : null;
  const [viewMonth, setViewMonth] = useState(() =>
    selected ? startOfMonth(selected) : startOfMonth(minDate)
  );

  const comfortable = size === "comfortable";

  useEffect(() => {
    if (selectedDate) {
      setViewMonth(startOfMonth(new Date(selectedDate + "T12:00:00")));
    }
  }, [selectedDate]);

  useEffect(() => {
    onMonthChange?.(format(viewMonth, "yyyy-MM"));
  }, [viewMonth, onMonthChange]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [viewMonth]);

  function isDisabled(day: Date) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    if (isBefore(dayStart, min)) return true;
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (dayStart > max) return true;
    }
    return false;
  }

  const canGoPrev = startOfMonth(viewMonth) > startOfMonth(minDate);

  return (
    <div className="min-w-0 w-full py-1">
      <div className={`flex items-center justify-between ${comfortable ? "mb-4" : "mb-3"}`}>
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className={`flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
            comfortable
              ? "size-10 text-muted-foreground hover:bg-muted hover:text-foreground"
              : "size-8 bg-muted text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Previous month"
        >
          <Icon name="chevron-left" className={comfortable ? "text-sm" : "text-xs"} />
        </button>
        <span className={`font-semibold text-foreground ${comfortable ? "text-base" : "text-sm"}`}>
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className={`flex items-center justify-center rounded-lg transition-colors ${
            comfortable
              ? "size-10 text-muted-foreground hover:bg-muted hover:text-foreground"
              : "size-8 bg-muted text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Next month"
        >
          <Icon name="chevron-right" className={comfortable ? "text-sm" : "text-xs"} />
        </button>
      </div>
      <div
        className={`grid w-full min-w-0 grid-cols-7 text-center ${comfortable ? "gap-2" : "gap-1.5"}`}
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className={`font-semibold text-muted-foreground ${comfortable ? "pb-3 text-xs tracking-wide" : "pb-1.5 text-[11px] tracking-wide"}`}
          >
            {comfortable ? d : d.slice(0, 3)}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const dateStr = format(day, "yyyy-MM-dd");
          const isSelected = selectedDate === dateStr;
          const disabled = !inMonth || isDisabled(day);
          const showToday = isToday(day) && !isSelected && !disabled;
          const isNextAvailable =
            nextAvailableDate === dateStr && !isSelected && !disabled && inMonth;
          const status = dayStatus?.[dateStr];
          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              className={`relative min-w-0 font-medium tabular-nums transition-[background-color,box-shadow,transform] ${
                comfortable
                  ? "mx-auto flex size-12 items-center justify-center rounded-full text-sm"
                  : "mx-auto flex size-9 items-center justify-center rounded-full text-xs xl:size-10 xl:text-sm"
              } ${
                !inMonth
                  ? "pointer-events-none opacity-0"
                  : isSelected
                  ? "booking-bg-accent text-white shadow-md booking-shadow-accent"
                  : disabled
                  ? "cursor-not-allowed text-muted-foreground/45 line-through"
                  : showToday
                  ? "font-semibold booking-text-accent ring-2 ring-(--booking-accent-soft)"
                  : isNextAvailable
                  ? "font-semibold booking-text-accent ring-2 ring-(--booking-accent) ring-offset-1 ring-offset-background"
                  : "text-foreground hover:booking-bg-accent-muted"
              }`}
            >
              {format(day, "d")}
              {/* Secondary hint: business has open slots. Deliberately faint —
                  it fires on almost every enabled day. Personal calendar
                  conflicts are surfaced on the time slots (cal.com-style),
                  not on the month grid. */}
              {inMonth && status === "available" && !isSelected && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full booking-bg-accent opacity-40"
                />
              )}
              {inMonth && status === "full" && !isSelected && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-muted-foreground/30"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
