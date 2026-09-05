"use client";

/**
 * Capture / internal preview + user-facing docs walkthrough visuals.
 * Always render React mockups — never wrap existing PNG screenshots
 * (that feedback loop produced identical onboarding crops on every guide).
 */

import IPhoneMockup from "@/components/ui/iphone-mockup";
import { docsFrameShadow, docsStageSurface } from "@/lib/docs/design-tokens";
import { cn } from "@/lib/utils";
import { DocsBookingMockup } from "./mockups/DocsBookingMockup";
import { DocsDashboardMockup } from "./mockups/DocsDashboardMockup";

const lights = {
  close: "#ff5f57",
  minimize: "#febc2e",
  zoom: "#28c840",
} as const;

type Props = {
  mockupId: string;
  scale?: number;
  highlightNav?: string;
  highlightTarget?: string;
  staged?: boolean;
  compact?: boolean;
};

export function DocsMockupCapture({
  mockupId,
  scale = 0.85,
  highlightNav,
  highlightTarget,
  staged = false,
  compact = false,
}: Props) {
  const isBooking = mockupId.startsWith("booking-");

  if (isBooking) {
    const phone = (
      <IPhoneMockup
        model="15"
        color="black"
        scale={compact ? 0.42 : scale}
        showDynamicIsland
        safeArea
        showHomeIndicator
      >
        <DocsBookingMockup variant={mockupId} highlightTarget={highlightTarget} />
      </IPhoneMockup>
    );
    if (!staged || compact) return phone;
    return (
      <div className={cn("flex justify-center rounded-[1.5rem] px-4 py-6 sm:px-8 sm:py-8", docsStageSurface)}>
        {phone}
      </div>
    );
  }

  const dashboard = (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-neutral-900",
        docsFrameShadow,
      )}
    >
      <BrowserChrome />
      <DocsDashboardMockup
        variant={mockupId}
        highlightNav={highlightNav}
        highlightTarget={highlightTarget}
      />
    </div>
  );

  if (!staged || compact) return dashboard;
  return (
    <div className={cn("p-2.5 sm:p-[0.65rem]", docsStageSurface, "rounded-[1.35rem] sm:rounded-[1.5rem]")}>
      {dashboard}
    </div>
  );
}

function BrowserChrome() {
  return (
    <div className="flex items-center gap-2 border-b border-black/[0.05] bg-[hsl(var(--dashboard-chrome))]/90 px-3 py-2 dark:border-white/[0.07]">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: lights.close }} />
      <span className="size-2.5 rounded-full" style={{ backgroundColor: lights.minimize }} />
      <span className="size-2.5 rounded-full" style={{ backgroundColor: lights.zoom }} />
      <div className="ml-1 flex min-w-0 flex-1 items-center rounded-md border border-black/[0.05] bg-white/85 px-2 py-0.5 dark:border-white/[0.08] dark:bg-neutral-800/90">
        <span className="truncate font-mono text-[10px] text-gray-500">dilini.dinaya.lk/dashboard</span>
      </div>
    </div>
  );
}
