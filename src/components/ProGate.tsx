import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import {
  canUseFeature,
  getBusinessPlan,
  minimumPlanForFeature,
  planDisplayName,
  planFeatureLabel,
  type Plan,
  type PlanFeature,
} from "@/lib/plan";

export async function ProGate({
  businessId,
  children,
  feature,
}: {
  businessId?: string;
  children: ReactNode;
  feature: PlanFeature;
}) {
  const plan = businessId
    ? await getBusinessPlan(businessId)
    : (await import("@/lib/auth")).requireBusiness().then((ctx) => ctx.business.plan as Plan);

  if (canUseFeature(await plan, feature)) {
    return <>{children}</>;
  }

  const requiredPlan = minimumPlanForFeature(feature);
  const requiredPlanLabel = planDisplayName(requiredPlan);

  return (
    <div className="mx-auto max-w-sm py-20 text-center">
      <div className="relative mx-auto flex size-12 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-violet-500/15 blur-md" aria-hidden="true" />
        <div className="relative flex size-12 items-center justify-center rounded-full bg-linear-to-b from-violet-500 to-violet-600 shadow-[0_1px_1px_rgba(255,255,255,0.4)_inset,0_8px_16px_-6px] shadow-violet-600/50">
          <Lock className="size-[18px] text-white" aria-hidden="true" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-violet-600 dark:text-violet-400">
        Dinaya {requiredPlanLabel}
      </p>
      <h2 className="mt-1.5 font-cal text-xl tracking-tight text-foreground">
        {planFeatureLabel(feature)}
      </h2>
      <p className="mx-auto mt-2 text-sm leading-6 text-muted-foreground">
        Upgrade your plan to unlock this for your business.
      </p>
      <a
        href="/dashboard/billing"
        className="mt-7 inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        View plan options
      </a>
    </div>
  );
}
