import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Activity, CalendarPlus } from "lucide-react";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { OnboardingCelebration } from "@/components/dashboard/OnboardingCelebration";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DashboardTodayRow } from "@/components/dashboard/DashboardTodayRow";
import {
  formatOverviewActivityAge,
  overviewActionDot,
  overviewEntityIconMap,
  type DashboardOverviewData,
} from "@/lib/dashboard/overview-data";
import {
  dashboardPageClass,
  dashboardPrimaryActionClass,
  dashboardSurfaceClass,
} from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  data: DashboardOverviewData;
};

function liveContextLine(data: DashboardOverviewData): string {
  const count = data.todayRows.length;
  const revenue = data.stats.find((s) => /revenue|lkr/i.test(s.label))?.value;
  const parts: string[] = [];
  parts.push(
    count === 0
      ? "No appointments today"
      : `${count} appointment${count === 1 ? "" : "s"} today`,
  );
  if (revenue != null && revenue !== "") {
    parts.push(String(revenue));
  }
  return parts.join(" · ");
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  const firstName = (data.ownerName ?? data.businessName).split(" ")[0];

  return (
    <div className={dashboardPageClass}>
      {/* Header — one primary CTA only */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {data.greetingDate}
          </p>
          <h1 className="mt-2 font-cal text-[2rem] leading-none tracking-tight sm:text-[2.5rem]">
            Good day, {firstName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{liveContextLine(data)}</p>
        </div>
        <Link href="/dashboard/bookings/new" className={cn(dashboardPrimaryActionClass, "self-start sm:self-auto")}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          New booking
        </Link>
      </div>

      <Suspense fallback={null}>
        <OnboardingCelebration bookingUrl={data.bookingUrl} bookingDisplayUrl={data.bookingDisplayUrl} />
      </Suspense>

      {data.showOnboarding ? (
        <OnboardingWizard
          steps={data.onboarding}
          bookingUrl={data.bookingUrl}
          whatsappShare={data.whatsappShare}
        />
      ) : null}

      {/* Today document — the product surface */}
      <section className={cn(dashboardSurfaceClass, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-cal text-lg tracking-tight">Today</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tap an appointment to confirm, message, or reschedule.
            </p>
          </div>
          <Link
            href="/dashboard/calendar"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Calendar
          </Link>
        </div>

        <div className="p-2 sm:p-3">
          {data.todayRows.length === 0 ? (
            <EmptyState
              className="border-0 bg-transparent shadow-none"
              title="No bookings today"
              description={
                data.nextRows.length > 0
                  ? "You’re clear for now — upcoming appointments are listed below."
                  : "When clients book, they show up here with time and status."
              }
              action={
                <Link href="/dashboard/bookings/new" className={dashboardPrimaryActionClass}>
                  Create booking
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {data.todayRows.map((row) => (
                <DashboardTodayRow
                  key={row.id}
                  id={row.id}
                  clientName={row.clientName}
                  clientPhone={row.clientPhone}
                  serviceName={row.serviceName}
                  staffName={row.staffName}
                  startsAt={row.startsAt}
                  status={row.status}
                />
              ))}
            </ul>
          )}

          {data.todayRows.length === 0 && data.nextRows.length > 0 ? (
            <div className="mt-2 space-y-1 border-t border-border/50 px-2 pt-3 sm:px-3">
              <p className="px-1 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Coming up
              </p>
              {data.nextRows.map((row) => (
                <Link
                  key={row.id}
                  href={`/dashboard/bookings/${row.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/50"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{row.clientName}</span>
                    <span className="text-muted-foreground"> · {row.serviceName}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {format(row.startsAt, "d MMM, h:mm a")}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Compact metrics — deferred below the ops surface */}
      {data.showStats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/60 bg-card/80 px-4 py-3"
            >
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{stat.value}</p>
              {stat.delta ? (
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{stat.delta}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.showShareCard ? (
          <section className={cn(dashboardSurfaceClass, "p-5")}>
            <h2 className="font-cal text-base tracking-tight">Share booking link</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Put this everywhere clients find you.
            </p>
            <code className="mt-3 block truncate rounded-xl bg-muted/60 px-3 py-2.5 font-mono text-sm text-foreground">
              {data.bookingDisplayUrl}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={data.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/5"
              >
                Open
              </a>
              <a
                href={data.whatsappShare}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/5"
              >
                WhatsApp
              </a>
              <Link
                href="/dashboard/marketing"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/5"
              >
                QR &amp; embed
              </Link>
            </div>
          </section>
        ) : null}

        <section className={cn(dashboardSurfaceClass, "p-5")}>
          <h2 className="font-cal text-base tracking-tight">Recent activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No recent activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.recentActivity.map((item, index) => {
                const EntityIcon = overviewEntityIconMap[item.entity] ?? Activity;
                const dot = overviewActionDot[item.action] ?? "bg-slate-300";
                const label = `${item.entity} ${item.action.replace(/_/g, " ")}`;
                return (
                  <li
                    key={`${item.entity}-${item.createdAt.toISOString()}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <div className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <EntityIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <span
                        className={cn(
                          "absolute -right-0.5 -top-0.5 size-2 rounded-full ring-1 ring-card",
                          dot,
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatOverviewActivityAge(item.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
