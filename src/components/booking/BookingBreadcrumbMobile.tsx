"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { BookingBreadcrumbItem } from "./BookingBreadcrumb";

type Props = {
  items: BookingBreadcrumbItem[];
  className?: string;
};

/**
 * Mobile nav-bar chrome: one "‹ [current step]" pill instead of the full
 * desktop breadcrumb trail — that trail wraps to a second line on narrow
 * screens with an orphaned leading "/", and multi-step jumps aren't a
 * pattern mobile users expect from a nav bar anyway (back only ever goes
 * one step back there). Styled after the rounded pill on the landing page's
 * booking demo.
 */
export function BookingBreadcrumbMobile({ items, className }: Props) {
  if (items.length === 0) return null;

  const current = items[items.length - 1]!;
  // Walk back to the nearest actionable crumb — an intermediate one may be a
  // non-clickable placeholder (e.g. the service name while locked to a hub
  // selection), and back should skip it rather than land on a dead button.
  let previous: BookingBreadcrumbItem | null = null;
  for (let i = items.length - 2; i >= 0; i--) {
    if (items[i]!.href || items[i]!.onClick) {
      previous = items[i]!;
      break;
    }
  }

  // Exact colors lifted from the landing page's own booking-demo pill
  // (ProductMockup's BackPill/CategoryPill, off-accent variant): bg-white/90
  // + border-black/5 + text-gray-700 in light, bg-white/8 + border-white/12
  // + text-zinc-200 in dark — measured via computed styles on the live demo,
  // not approximated from a similar-looking component.
  const pillClass = cn(
    "inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-full border px-4 text-base font-semibold transition-colors",
    "border-black/5 bg-white/90 text-gray-700",
    "dark:border-white/12 dark:bg-white/8 dark:text-zinc-200",
    "hover:border-black/10 hover:text-gray-900 dark:hover:border-white/20 dark:hover:text-white",
    "active:scale-[0.96] motion-reduce:active:scale-100",
    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
  );

  const content = (
    <>
      <Icon name="chevron-left" className="shrink-0 text-sm" />
      <span className="min-w-0 truncate">{current.label}</span>
    </>
  );

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      {previous?.href ? (
        <Link href={previous.href} aria-label={`Back to ${previous.label}`} className={pillClass}>
          {content}
        </Link>
      ) : previous?.onClick ? (
        <button
          type="button"
          onClick={previous.onClick}
          aria-label={`Back to ${previous.label}`}
          className={pillClass}
        >
          {content}
        </button>
      ) : (
        <p className="min-w-0 truncate px-1 text-base font-semibold text-foreground">{current.label}</p>
      )}
    </div>
  );
}
