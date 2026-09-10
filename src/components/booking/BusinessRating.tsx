"use client";

import { cn } from "@/lib/utils";
import type { BookingCopy } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StarRating } from "./StarRating";

export { getBusinessRating } from "@/lib/booking/rating";

interface BusinessRatingProps {
  avgRating: number;
  reviewCount: number;
  copy: BookingCopy;
  size?: "sm" | "md";
  showAttribution?: boolean;
  compactAttribution?: boolean;
  animateCount?: boolean;
  /** "row" (default) shows all 5 stars; "single" shows one star glyph for tight columns. */
  starDisplay?: "row" | "single";
  className?: string;
}

function reviewLabel(copy: BookingCopy, count: number, compact?: boolean) {
  const formatted = count.toLocaleString();
  if (compact) {
    if (count === 1) return copy.reviewCountSingular;
    return copy.reviewsCount.replace("{count}", formatted);
  }
  if (count === 1) return copy.reviewOnDinaya;
  return copy.reviewsOnDinaya.replace("{count}", formatted);
}

export function BusinessRating({
  avgRating,
  reviewCount,
  copy,
  size = "sm",
  showAttribution = true,
  compactAttribution = false,
  animateCount = false,
  starDisplay = "row",
  className,
}: BusinessRatingProps) {
  if (reviewCount <= 0) return null;

  const scoreClass = size === "md" ? "text-sm" : "text-xs";

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {starDisplay === "row" ? <StarRating rating={avgRating} size={size} /> : null}
      {animateCount ? (
        <NumberTicker
          value={avgRating}
          decimalPlaces={1}
          className={cn("font-semibold text-foreground", scoreClass)}
        />
      ) : (
        <span className={cn("font-semibold tabular-nums text-foreground", scoreClass)}>
          {avgRating.toFixed(1)}
        </span>
      )}
      {starDisplay === "single" ? (
        <Icon
          name="star-fill"
          className={cn("text-amber-500 dark:text-amber-400/85", size === "md" ? "text-base" : "text-xs")}
        />
      ) : null}
      {showAttribution ? (
        <>
          {starDisplay === "single" ? (
            <span aria-hidden className={cn("text-muted-foreground/50", scoreClass)}>
              ·
            </span>
          ) : null}
          <span className={cn("text-muted-foreground", scoreClass)}>
            {reviewLabel(copy, reviewCount, compactAttribution)}
          </span>
        </>
      ) : null}
    </div>
  );
}
