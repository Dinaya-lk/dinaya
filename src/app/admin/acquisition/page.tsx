import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  getAcquisitionCohorts,
  getAcquisitionKpis,
  getAcquisitionSourceMix,
  getBusinessTypeMix,
  getStuckOnboardingAccounts,
  type AcquisitionDays,
} from "@/lib/admin-acquisition";

export const dynamic = "force-dynamic";

function parseDays(value: string | string[] | undefined): AcquisitionDays {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "7" || raw === "90") return Number(raw) as AcquisitionDays;
  return 30;
}

export default async function AdminAcquisitionPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const days = parseDays(params.days);

  const [kpis, sources, types, cohorts, stuck] = await Promise.all([
    getAcquisitionKpis(days),
    getAcquisitionSourceMix(days),
    getBusinessTypeMix(days),
    getAcquisitionCohorts(days),
    getStuckOnboardingAccounts(40),
  ]);

  const dayOptions: AcquisitionDays[] = [7, 30, 90];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-cal text-3xl tracking-tight">Acquisition</h1>
            <p className="text-sm text-muted-foreground">
              Signup → onboarding → first booking funnel for Ovindu &amp; Suven weekly review.
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border p-1 dark:border-neutral-800">
          {dayOptions.map((option) => (
            <Link
              key={option}
              href={`/admin/acquisition?days=${option}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                days === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {option}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Signups", value: kpis.signups, hint: `Last ${days} days` },
          { label: "Onboarded", value: `${kpis.onboardingRate}%`, hint: `${kpis.onboarded} completed setup` },
          { label: "First booking", value: `${kpis.activationRate}%`, hint: `${kpis.activated} activated` },
          { label: "Paid (Pro/Growth)", value: `${kpis.paidRate}%`, hint: `${kpis.paid} on paid plan` },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold">Source mix</h2>
          </div>
          {sources.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">No signups in this window.</p>
          ) : (
            <div className="divide-y dark:divide-neutral-800">
              {sources.map((row) => (
                <div key={row.source} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium capitalize">{row.source}</span>
                  <span className="tabular-nums text-muted-foreground">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold">Business type</h2>
          </div>
          {types.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">No signups in this window.</p>
          ) : (
            <div className="divide-y dark:divide-neutral-800">
              {types.map((row) => (
                <div key={row.source} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">{row.source.replaceAll("_", " ")}</span>
                  <span className="tabular-nums text-muted-foreground">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">Weekly cohorts</h2>
        </div>
        {cohorts.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">No cohort data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Signups</th>
                  <th className="px-4 py-3">Onboarded %</th>
                  <th className="px-4 py-3">Activated %</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800">
                {cohorts.map((row) => (
                  <tr key={row.weekStart}>
                    <td className="px-4 py-3 tabular-nums">{row.weekStart}</td>
                    <td className="px-4 py-3 tabular-nums">{row.signups}</td>
                    <td className="px-4 py-3 tabular-nums">{row.onboardedRate}%</td>
                    <td className="px-4 py-3 tabular-nums">{row.activatedRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">Stuck in setup (&gt;3 days)</h2>
          <Link href="/admin/accounts?plan=trial" className="text-xs font-medium text-primary hover:underline">
            View trial accounts →
          </Link>
        </div>
        {stuck.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">No stuck accounts — nice.</p>
        ) : (
          <div className="divide-y dark:divide-neutral-800">
            {stuck.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <Link href={`/admin/accounts/${row.id}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.slug}.dinaya.lk · step {row.onboardingStep}/4 · signed up{" "}
                    {format(row.createdAt, "d MMM yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
