import Link from "next/link";
import { and, desc, eq, ilike, or, count } from "drizzle-orm";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { safeAdminQuery } from "@/lib/admin-db";
import { likePattern } from "@/lib/like";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { listPlatformAdminMembers } from "@/lib/platform-admin-members";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  role?: "owner" | "staff" | "all";
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const adminMembers = await listPlatformAdminMembers();
  const adminEmailSet = new Set(adminMembers.map((member) => member.email.toLowerCase()));
  const q = (sp.q ?? "").trim();
  const roleFilter = sp.role && sp.role !== "all" ? sp.role : null;

  const searchExpr = q
    ? or(ilike(users.email, likePattern(q)), ilike(users.name, likePattern(q)))
    : undefined;
  const roleExpr = roleFilter ? eq(users.role, roleFilter) : undefined;
  const whereExpr =
    searchExpr && roleExpr ? and(searchExpr, roleExpr) : searchExpr ?? roleExpr;

  const rows = await safeAdminQuery(
    db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      businessId: businesses.id,
      businessName: businesses.name,
      businessSlug: businesses.slug,
    })
    .from(users)
    .innerJoin(businesses, eq(businesses.id, users.businessId))
    .where(whereExpr)
    .orderBy(desc(users.createdAt))
    .limit(200),
    [],
  );

  const [{ totalUsers }] = await safeAdminQuery(
    db.select({ totalUsers: count() }).from(users),
    [{ totalUsers: 0 }] as { totalUsers: number }[],
  );

  const roleChips: { value: "all" | "owner" | "staff"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "owner", label: "Owners" },
    { value: "staff", label: "Staff" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-cal text-3xl tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {Number(totalUsers).toLocaleString()} total · showing {rows.length}
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or email"
            className="h-10 w-full rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 pl-9 pr-3 text-sm outline-hidden transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
          <input type="hidden" name="q" value={q} />
          {roleChips.map((chip) => {
            const active = (sp.role ?? "all") === chip.value;
            return (
              <button
                key={chip.value}
                type="submit"
                name="role"
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
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No users match these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const platformAdmin = adminEmailSet.has(r.email.toLowerCase());
                return (
                  <tr key={r.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.role === "owner"
                            ? "rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary"
                            : "rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
                        }
                      >
                        {r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/accounts/${r.businessId}`} className="hover:text-primary hover:underline">
                        {r.businessName}
                      </Link>
                      <p className="text-xs text-muted-foreground">/{r.businessSlug}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(r.createdAt, "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      {platformAdmin && (
                        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700">
                          Platform admin
                        </span>
                      )}
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
