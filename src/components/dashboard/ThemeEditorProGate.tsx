"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { themeEditorFeatureLabel, themeEditorPlanLabel } from "@/lib/plan-client";
import type { PlanFeature } from "@/lib/plan";

export function ThemeEditorProGateCard({ feature }: { feature: PlanFeature }) {
  const requiredPlan = themeEditorPlanLabel(feature);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
      <div className="relative flex size-9 shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-violet-500/15 blur-sm" aria-hidden="true" />
        <div className="relative flex size-9 items-center justify-center rounded-full bg-linear-to-b from-violet-500 to-violet-600 shadow-[0_1px_1px_rgba(255,255,255,0.4)_inset,0_4px_10px_-4px] shadow-violet-600/50">
          <Lock className="size-4 text-white" aria-hidden="true" strokeWidth={2} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-violet-600 dark:text-violet-400">
          Dinaya {requiredPlan}
        </p>
        <p className="mt-0.5 font-medium text-foreground">{themeEditorFeatureLabel(feature)}</p>
        <p className="mt-1 text-muted-foreground">Upgrade your plan to unlock this.</p>
        <Link
          href="/dashboard/billing"
          className="mt-3 inline-flex min-h-9 items-center rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View plan options
        </Link>
      </div>
    </div>
  );
}

export function ThemeEditorLockedSection({
  enabled,
  feature,
  children,
}: {
  enabled: boolean;
  feature: PlanFeature;
  children: React.ReactNode;
}) {
  if (enabled) return <>{children}</>;

  return (
    <div className="space-y-3">
      <div className="pointer-events-none select-none opacity-55" aria-hidden="true">
        {children}
      </div>
      <ThemeEditorProGateCard feature={feature} />
    </div>
  );
}
