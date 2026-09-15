import { ProGate } from "@/components/ProGate";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DealAnalyticsPanel } from "@/components/dashboard/DealAnalyticsPanel";
import { ReportsToolbar } from "@/components/dashboard/ReportsToolbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { getReportsDashboardOverview } from "@/lib/dashboard/reports";
import { getDealAnalytics } from "@/lib/deals/analytics";
import { requireBusiness } from "@/lib/auth";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { dashboardPageClass } from "@/lib/dashboard-ui";
import { BarChart3, CalendarDays, Star, Users } from "lucide-react";
import { Suspense } from "react";

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "pm" : "am";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${suffix}`;
}

function initialsFor(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { businessId } = await requireBusiness();
  const params = await searchParams;

  return (
    <ProGate businessId={businessId} feature="reports">
      <ReportsOverview businessId={businessId} from={params.from} to={params.to} />
    </ProGate>
  );
}

async function ReportsOverview({
  businessId,
  from,
  to,
}: {
  businessId: string;
  from?: string;
  to?: string;
}) {
  const [reports, dealAnalytics] = await Promise.all([
    getReportsDashboardOverview(businessId, { from, to }),
    getDealAnalytics(businessId),
  ]);

  const { breakdowns, metrics, trends, export: exportPayload, range } = reports;
  const maxHealthCount = Math.max(
    metrics.completedBookings,
    metrics.cancelledBookings,
    metrics.noShows,
    1,
  );
  const maxSourceCount = Math.max(...breakdowns.bookingsBySource.map((row) => row.value), 1);
  const maxStaffCount = Math.max(...breakdowns.staffLoad.map((row) => row.value), 1);
  const bookingHealth = [
    { name: "Completed", value: metrics.completedBookings },
    { name: "Cancelled", value: metrics.cancelledBookings },
    { name: "No-show", value: metrics.noShows },
  ].filter((item) => item.value > 0);

  return (
    <div className={dashboardPageClass}>
      <DashboardPageHeader
        title="Analytics & Reports"
        description={
          <>
            Revenue trends, booking patterns, client spend, and staff workload
            {range?.from && range?.to ? ` · ${range.from} → ${range.to}` : ""}.
          </>
        }
      />

      <Suspense fallback={null}>
        <ReportsToolbar
          csv={exportPayload.csv}
          filename={exportPayload.filename}
          initialFrom={range.from}
          initialTo={range.to}
        />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={metrics.totalRevenueLabel}
          icon={BarChart3}
          tone="cobalt"
        />
        <StatCard
          label="Bookings"
          value={metrics.totalBookings}
          icon={CalendarDays}
          tone="amber"
        />
        <StatCard
          label="Clients"
          value={metrics.totalClients}
          icon={Users}
          tone="slate"
        />
        <StatCard
          label="Avg. rating"
          value={metrics.averageRating.toFixed(1)}
          icon={Star}
          tone="violet"
        />
      </div>

      <AnalyticsCharts
        revenueByDay={trends.revenueByWeekday}
        revenueByService={breakdowns.revenueByService.map((row) => ({
          name: row.label,
          value: row.value,
        }))}
        busiestHours={trends.busiestHours.map((row) => ({
          name: formatHour(row.hour),
          value: row.value,
        }))}
        bookingHealth={bookingHealth}
        topClients={breakdowns.topClients.map((row) => ({
          name: row.label,
          spend: row.value,
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection title="Booking health summary">
          <div className="space-y-4">
            {[
              { label: "Completed", value: metrics.completedBookings },
              { label: "Cancelled", value: metrics.cancelledBookings },
              { label: "No-show", value: metrics.noShows },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-semibold tabular-nums">{item.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/50 transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.round((item.value / maxHealthCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg bg-muted/40 py-3 text-center">
                <p className="text-lg font-semibold tabular-nums">{metrics.cancellationRate}%</p>
                <p className="text-xs text-muted-foreground">Cancellation rate</p>
              </div>
              <div className="rounded-lg bg-muted/40 py-3 text-center">
                <p className="text-lg font-semibold tabular-nums">{metrics.noShowRate}%</p>
                <p className="text-xs text-muted-foreground">No-show rate</p>
              </div>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Bookings by source" className="lg:col-span-2">
          {breakdowns.bookingsBySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {breakdowns.bookingsBySource.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{row.label}</span>
                    <span className="text-muted-foreground">{row.value} bookings</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.round((row.value / maxSourceCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Bookings by staff" className="lg:col-span-2">
          {breakdowns.staffLoad.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {breakdowns.staffLoad.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {initialsFor(row.label)}
                      </span>
                      <span className="font-medium">{row.label}</span>
                    </div>
                    <span className="text-muted-foreground">{row.value} bookings</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/50"
                      style={{ width: `${Math.round((row.value / maxStaffCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      <DealAnalyticsPanel analytics={dealAnalytics} />
    </div>
  );
}
