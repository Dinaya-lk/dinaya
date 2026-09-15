import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { db } from "@/db";
import { activityLog, businesses, users } from "@/db/schema";
import { safeAdminQuery } from "@/lib/admin-db";
import { ADMIN_PAGE_SIZE, adminPageOffset, parseAdminPage } from "@/lib/admin-pagination";
import { likePattern } from "@/lib/like";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AdminPagination } from "@/components/admin/AdminPagination";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entity?: string; page?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const entity = (sp.entity ?? "").trim();
  const page = parseAdminPage(sp.page);

  const searchExpr = q
    ? or(ilike(activityLog.action, likePattern(q)), ilike(businesses.name, likePattern(q)))
    : undefined;
  const entityExpr = entity ? eq(activityLog.entity, entity) : undefined;
  const whereExpr =
    searchExpr && entityExpr ? and(searchExpr, entityExpr) : searchExpr ?? entityExpr;

  const rows = await safeAdminQuery(
    db
    .select({
      id: activityLog.id,
      entity: activityLog.entity,
      action: activityLog.action,
      createdAt: activityLog.createdAt,
      meta: activityLog.meta,
      businessId: businesses.id,
      businessName: businesses.name,
      actorEmail: users.email,
      actorName: users.name,
    })
    .from(activityLog)
    .innerJoin(businesses, eq(businesses.id, activityLog.businessId))
    .leftJoin(users, eq(users.id, activityLog.actorUserId))
    .where(whereExpr)
    .orderBy(desc(activityLog.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(adminPageOffset(page)),
    [],
  );

  const [{ filteredTotal }] = await safeAdminQuery(
    db
      .select({ filteredTotal: count() })
      .from(activityLog)
      .innerJoin(businesses, eq(businesses.id, activityLog.businessId))
      .where(whereExpr),
    [{ filteredTotal: 0 }] as { filteredTotal: number }[],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-cal text-3xl tracking-tight">Activity log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent events across every tenant. {Number(filteredTotal).toLocaleString()} matching.
          </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search action or business"
            className="h-10 w-full rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 pl-9 pr-3 text-sm outline-hidden transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <input
          type="text"
          name="entity"
          defaultValue={entity}
          placeholder="entity (e.g. booking)"
          className="h-10 w-44 rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 text-sm outline-hidden focus:ring-2 focus:ring-primary/30"
        />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No activity matches these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {format(r.createdAt, "d MMM, h:mm a")}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/accounts/${r.businessId}`} className="hover:text-primary hover:underline">
                      {r.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.7rem] font-mono text-muted-foreground">
                      {r.entity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">
                    {r.action.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.actorEmail ? (
                      <>
                        <p className="text-sm">{r.actorName ?? "—"}</p>
                        <p className="text-xs">{r.actorEmail}</p>
                      </>
                    ) : (
                      <span className="text-xs italic">system</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t dark:border-neutral-800">
          <AdminPagination
            basePath="/admin/activity"
            params={{ q: q || undefined, entity: entity || undefined }}
            page={page}
            rowCount={rows.length}
            total={Number(filteredTotal)}
            pageSize={ADMIN_PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
}
