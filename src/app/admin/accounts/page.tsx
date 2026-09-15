import Link from "next/link";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { format } from "date-fns";
import { ChevronRight, Search } from "lucide-react";
import { db } from "@/db";
import { bookings, businesses, subscriptions, users } from "@/db/schema";
import { safeAdminQuery } from "@/lib/admin-db";
import { likePattern } from "@/lib/like";
import { planDisplayName, type Plan } from "@/lib/plan";
import { formatLkr } from "@/lib/utils";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  plan?: "trial" | "starter" | "pro" | "max" | "expired" | "all";
};

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const planFilter = sp.plan && sp.plan !== "all" ? sp.plan : null;

  const searchExpr = q
    ? or(
        ilike(businesses.name, likePattern(q)),
        ilike(businesses.slug, likePattern(q)),
        ilike(businesses.email, likePattern(q))
      )
    : undefined;
  const planExpr = planFilter ? eq(businesses.plan, planFilter) : undefined;
  const whereExpr =
    searchExpr && planExpr
      ? and(searchExpr, planExpr)
      : searchExpr ?? planExpr;

  const rows = await safeAdminQuery(
    db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      email: businesses.email,
      phone: businesses.phone,
      plan: businesses.plan,
      createdAt: businesses.createdAt,
      bookingCount: sql<number>`coalesce(count(distinct ${bookings.id}), 0)::int`,
      userCount: sql<number>`coalesce(count(distinct ${users.id}), 0)::int`,
      subStatus: sql<string | null>`max(${subscriptions.status}::text)`,
      mrr: sql<number>`coalesce(sum(case when ${subscriptions.status} = 'active' then ${subscriptions.amountLkr} else 0 end), 0)::int`,
    })
    .from(businesses)
    .leftJoin(bookings, eq(bookings.businessId, businesses.id))
    .leftJoin(users, eq(users.businessId, businesses.id))
    .leftJoin(subscriptions, eq(subscriptions.businessId, businesses.id))
    .where(whereExpr)
    .groupBy(businesses.id)
    .orderBy(desc(businesses.createdAt))
    .limit(100),
    [],
  );

  const [{ totalAccounts }] = await safeAdminQuery(
    db.select({ totalAccounts: count() }).from(businesses),
    [{ totalAccounts: 0 }] as { totalAccounts: number }[],
  );

  const planChips: { value: "all" | Plan; label: string }[] = [
    { value: "all", label: "All" },
    { value: "trial", label: "Trial" },
    { value: "starter", label: "Starter" },
    { value: "pro", label: "Pro" },
    { value: "max", label: "Growth" },
    { value: "expired", label: "Expired" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-cal text-3xl tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {Number(totalAccounts).toLocaleString()} total · showing {rows.length}
          </p>
        </div>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-center gap-3 rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-3"
      >
        <div className="relative min-w-[16rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, slug, or email"
            className="h-10 w-full rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 pl-9 pr-3 text-sm outline-hidden transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
          {planChips.map((chip) => {
            const active = (sp.plan ?? "all") === chip.value;
            return (
              <button
                key={chip.value}
                type="submit"
                name="plan"
                value={chip.value}
                className={
                  active
                    ? "rounded px-3 py-1.5 text-xs font-semibold bg-white text-primary shadow-xs"
                    : "rounded px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium text-right">MRR</th>
                <th className="px-4 py-3 font-medium text-right">Bookings</th>
                <th className="px-4 py-3 font-medium text-right">Users</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No accounts match these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const status = r.subStatus ?? null;
                const statusStyle =
                  status === "active"
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                    : status === "past_due"
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700"
                    : status === "cancelled" || status === "ended"
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700"
                    : "bg-muted text-muted-foreground";
                return (
                  <tr key={r.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/accounts/${r.id}`}
                        className="block min-w-0"
                      >
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /{r.slug}
                          {r.email ? ` · ${r.email}` : ""}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.plan === "pro"
                            ? "rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary"
                            : r.plan === "starter"
                              ? "rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-700"
                            : r.plan === "max"
                              ? "rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-700"
                            : "rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
                        }
                      >
                        {planDisplayName(r.plan as Plan)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${statusStyle}`}
                      >
                        {status ? status.replace("_", " ") : "None"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(r.mrr) > 0 ? formatLkr(Number(r.mrr)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.bookingCount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.userCount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(r.createdAt, "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/accounts/${r.id}`}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Open ${r.name}`}
                      >
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
