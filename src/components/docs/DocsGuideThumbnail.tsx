"use client";

import { cn } from "@/lib/utils";
import { DocsDashboardMockup } from "./mockups/DocsDashboardMockup";
import { DocsBookingMockup } from "./mockups/DocsBookingMockup";

type Props = {
  mockupId?: string;
  screenshotSrc?: string;
  className?: string;
};

function shotIdFromSrc(src: string): string | undefined {
  const match = src.match(/\/docs\/screenshots\/([^/.]+)/);
  return match?.[1];
}

/**
 * Hub / related-guide thumbnail — cropped mockup of the actual guide surface.
 */
export function DocsGuideThumbnail({ mockupId, screenshotSrc, className }: Props) {
  const id = mockupId ?? (screenshotSrc ? shotIdFromSrc(screenshotSrc) : undefined);

  if (!id) {
    return (
      <div
        className={cn(
          "flex h-32 items-center justify-center rounded-[0.9rem] bg-[hsl(240_6%_96%)] text-xs text-muted-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-[hsl(240_5%_8%)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
          className,
        )}
      >
        Guide preview
      </div>
    );
  }

  const isBooking = id.startsWith("booking-");

  return (
    <div
      className={cn(
        "relative h-32 overflow-hidden rounded-[0.9rem] bg-[hsl(240_6%_96%)]",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:bg-[hsl(240_5%_8%)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
        className,
      )}
    >
      <div className="pointer-events-none origin-top-left scale-[0.38]">
        {isBooking ? (
          <div className="h-[844px] w-[390px] bg-white">
            <DocsBookingMockup variant={id} />
          </div>
        ) : (
          <div className="w-[54rem]">
            <DocsDashboardMockup variant={id} />
          </div>
        )}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/[0.08] via-black/[0.02] to-transparent dark:from-black/45"
        aria-hidden
      />
    </div>
  );
}
