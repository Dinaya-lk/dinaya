import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import { db } from "@/db";
import { businesses, subscriptions } from "@/db/schema";
import { safeAdminQuery } from "@/lib/admin-db";
import { ADMIN_PAGE_SIZE, adminPageOffset, parseAdminPage } from "@/lib/admin-pagination";
import { formatLkr } from "@/lib/utils";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AdminPagination } from "@/components/admin/AdminPagination";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700",
  past_due: "bg-amber-50 dark:bg-amber-950/30 text-amber-700",
  cancelled: "bg-rose-50 dark:bg-rose-950/30 text-rose-700",
  ended: "bg-muted text-muted-foreground",
};

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const page = parseAdminPage(sp.page);
  const statusFilter =
    sp.status && ["active", "past_due", "cancelled", "ended"].includes(sp.status)
      ? (sp.status as "active" | "past_due" | "cancelled" | "ended")
      : null;

  const rows = await safeAdminQuery(
    db
    .select({
      id: subscriptions.id,
      payhereOrderId: subscriptions.payhereOrderId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      amountLkr: subscriptions.amountLkr,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelledAt: subscriptions.cancelledAt,
      createdAt: subscriptions.createdAt,
      businessId: businesses.id,
      businessName: businesses.name,
    })
    .from(subscriptions)
    .innerJoin(businesses, eq(businesses.id, subscriptions.businessId))
    .where(statusFilter ? eq(subscriptions.status, statusFilter) : undefined)
    .orderBy(desc(subscriptions.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(adminPageOffset(page)),
    [],
  );

  const filterCount = await safeAdminQuery(
    db
      .select({ filteredTotal: count() })
      .from(subscriptions)
      .where(statusFilter ? eq(subscriptions.status, statusFilter) : undefined),
    [{ filteredTotal: 0 }] as { filteredTotal: number }[],
  );
  const filteredTotal = Number(filterCount[0]?.filteredTotal ?? 0);

  const summary = await safeAdminQuery(
    db
    .select({
      status: subscriptions.status,
      count: sql<number>`count(*)::int`,
      sum: sql<number>`coalesce(sum(${subscriptions.amountLkr}), 0)::int`,
    })
    .from(subscriptions)
    .groupBy(subscriptions.status),
    [],
  );

  const byStatus = Object.fromEntries(
    summary.map((s) => [s.status, { count: Number(s.count), sum: Number(s.sum) }])
  );

  const tiles = [
    {
      label: "Active",
      value: byStatus.active?.count ?? 0,
      sub: formatLkr(byStatus.active?.sum ?? 0) + " MRR",
      accent: "bg-emerald-50 dark:bg-emerald-950/400",
    },
    {
      label: "Past due",
      value: byStatus.past_due?.count ?? 0,
      sub: formatLkr(byStatus.past_due?.sum ?? 0) + " at risk",
      accent: "bg-amber-50 dark:bg-amber-950/400",
    },
    {
      label: "Cancelled",
      value: byStatus.cancelled?.count ?? 0,
      sub: "lifetime",
      accent: "bg-rose-50 dark:bg-rose-950/400",
    },
    {
      label: "Ended",
      value: byStatus.ended?.count ?? 0,
      sub: "lifetime",
      accent: "bg-muted-foreground",
    },
  ];

  const statusChips: { value: string | null; label: string }[] = [
    { value: null, label: "All" },
    { value: "active", label: "Active" },
    { value: "past_due", label: "Past due" },
    { value: "cancelled", label: "Cancelled" },
    { value: "ended", label: "Ended" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-cal text-3xl tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pro plan billing across all tenants.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="overflow-hidden rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className={`h-[3px] ${t.accent}`} />
            <div className="p-5">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{t.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusChips.map((chip) => {
          const active = (sp.status ?? null) === (chip.value ?? null);
          const href = chip.value ? `?status=${chip.value}` : "?";
          return (
            <Link
              key={chip.label}
              href={href}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-full border bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Renews</th>
                <th className="px-4 py-3 font-medium">PayHere order</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <CreditCard className="mx-auto mb-2 size-6 text-muted-foreground/50" aria-hidden="true" />
                    No subscriptions {statusFilter ? `with status "${statusFilter}"` : "yet"}.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/accounts/${r.businessId}`} className="font-medium hover:text-primary hover:underline">
                      {r.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
                      {r.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${STATUS_STYLES[r.status] ?? "bg-muted text-muted-foreground"}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatLkr(r.amountLkr)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.currentPeriodEnd ? format(r.currentPeriodEnd, "d MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.payhereOrderId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t dark:border-neutral-800">
          <AdminPagination
            basePath="/admin/subscriptions"
            params={{ status: sp.status }}
            page={page}
            rowCount={rows.length}
            total={filteredTotal}
            pageSize={ADMIN_PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
}
