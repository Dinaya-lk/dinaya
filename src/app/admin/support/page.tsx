import { count, desc, eq, ilike, or } from "drizzle-orm";
import { LifeBuoy, Search } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { safeAdminQuery } from "@/lib/admin-db";
import { ADMIN_PAGE_SIZE, adminPageOffset, parseAdminPage } from "@/lib/admin-pagination";
import { likePattern } from "@/lib/like";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { RefundPaymentForm } from "./RefundPaymentForm";
import { SupportClient } from "./SupportClient";
import { AdminPagination } from "@/components/admin/AdminPagination";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = parseAdminPage(sp.page);

  const whereExpr = q
    ? or(ilike(users.email, likePattern(q)), ilike(users.name, likePattern(q)), ilike(businesses.name, likePattern(q)))
    : undefined;

  const rows = await safeAdminQuery(
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        businessName: businesses.name,
      })
      .from(users)
      .innerJoin(businesses, eq(businesses.id, users.businessId))
      .where(whereExpr)
      .orderBy(desc(users.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset(adminPageOffset(page)),
    [] as {
      id: string;
      name: string;
      email: string;
      role: "owner" | "staff";
      businessName: string;
    }[],
  );

  const [{ filteredTotal }] = await safeAdminQuery(
    db
      .select({ filteredTotal: count() })
      .from(users)
      .innerJoin(businesses, eq(businesses.id, users.businessId))
      .where(whereExpr),
    [{ filteredTotal: 0 }] as { filteredTotal: number }[],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-cal text-3xl tracking-tight">Support</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-rose-700">
            <LifeBuoy className="size-3" aria-hidden="true" />
            Internal use
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Password resets, read-only impersonation, payment refunds, and webhook replay tools.
          All actions are recorded in the security audit log.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by user name, email, or business name"
            className="h-10 w-full rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 pl-9 pr-3 text-sm outline-hidden transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Search
        </button>
      </form>

      <SupportClient users={rows} />
      <AdminPagination
        basePath="/admin/support"
        params={{ q: q || undefined }}
        page={page}
        rowCount={rows.length}
        total={Number(filteredTotal)}
        pageSize={ADMIN_PAGE_SIZE}
      />

      <RefundPaymentForm />

      <div className="rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-5 text-sm">
        <p className="font-semibold">Webhook replay</p>
        <p className="mt-1 text-muted-foreground">
          Failed webhook deliveries can be replayed from the{" "}
          <Link href="/admin/webhooks" className="text-primary hover:underline">
            webhook deliveries
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
