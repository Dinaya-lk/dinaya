"use client";

import { cn } from "@/lib/utils";

type Props = {
  serviceName?: string | null;
  staffLabel?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  stepLabel?: string | null;
  holdLabel?: string | null;
  slotUnavailable?: boolean;
  slotTaken?: string;
  slotTakenAction?: string;
  className?: string;
};

export function BookingChoiceSummary({
  serviceName,
  staffLabel,
  dateLabel,
  timeLabel,
  stepLabel,
  holdLabel,
  slotUnavailable,
  slotTaken,
  slotTakenAction,
  className,
}: Props) {
  const parts = [serviceName, staffLabel, dateLabel, timeLabel].filter(Boolean);
  const text = parts.length > 0 ? parts.join(" · ") : stepLabel;

  if (!text && !holdLabel && !slotUnavailable) return null;

  return (
    <div className={cn("min-w-0", className)}>
      {text ? (
        <p className="truncate text-base font-medium text-foreground md:text-sm" title={text} aria-live="polite">
          {text}
        </p>
      ) : null}
      {slotUnavailable && slotTaken ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 lg:hidden">
          <p className="font-medium">{slotTaken}</p>
          {slotTakenAction ? (
            <p className="mt-1 text-amber-700/90 dark:text-amber-300/90">{slotTakenAction}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
