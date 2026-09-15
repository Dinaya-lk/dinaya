import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import type { WebhookDelivery } from "@/db/schema";
import { businesses, webhookDeliveries, webhooks } from "@/db/schema";
import { safeAdminQuery } from "@/lib/admin-db";
import { ADMIN_PAGE_SIZE, adminPageOffset, parseAdminPage } from "@/lib/admin-pagination";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { WebhooksAdminClient } from "./WebhooksAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePlatformAdmin();
  const page = parseAdminPage((await searchParams).page);

  const rows = await safeAdminQuery(
    db
      .select({
        id: webhookDeliveries.id,
        event: webhookDeliveries.event,
        status: webhookDeliveries.status,
        attempts: webhookDeliveries.attempts,
        error: webhookDeliveries.error,
        createdAt: webhookDeliveries.createdAt,
        webhookUrl: webhooks.url,
        businessName: businesses.name,
      })
      .from(webhookDeliveries)
      .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
      .innerJoin(businesses, eq(webhooks.businessId, businesses.id))
      .where(eq(webhookDeliveries.status, "failed"))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset(adminPageOffset(page)),
    [] as {
      id: string;
      event: WebhookDelivery["event"];
      status: string;
      attempts: number;
      error: string | null;
      createdAt: Date;
      webhookUrl: string;
      businessName: string;
    }[],
  );

  const [{ filteredTotal }] = await safeAdminQuery(
    db
      .select({ filteredTotal: count() })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, "failed")),
    [{ filteredTotal: 0 }] as { filteredTotal: number }[],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-cal text-3xl tracking-tight">Webhook deliveries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Failed outbound webhook deliveries across all businesses ({Number(filteredTotal).toLocaleString()}).
          Replay is logged in the security audit.
        </p>
      </div>
      <WebhooksAdminClient
        deliveries={rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
      <AdminPagination
        basePath="/admin/webhooks"
        params={{}}
        page={page}
        rowCount={rows.length}
        total={Number(filteredTotal)}
        pageSize={ADMIN_PAGE_SIZE}
      />
    </div>
  );
}
