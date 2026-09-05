import { ProGate } from "@/components/ProGate";
import { requireOwner } from "@/lib/auth";
import { getPaymentsDashboardList } from "@/lib/dashboard/payments";
import { cn, formatLkr } from "@/lib/utils";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { dashboardCardClass, dashboardOutlineActionClass, dashboardPageClass, dashboardPrimaryActionClass } from "@/lib/dashboard-ui";
import { CreditCard } from "lucide-react";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { businessId } = await requireOwner();
  const { cursor: cursorParam } = await searchParams;
  const cursor = cursorParam ? new Date(cursorParam) : null;
  const { rows, hasMore, nextCursor } = await getPaymentsDashboardList(businessId, {
    limit: 100,
    cursor: cursor && !Number.isNaN(cursor.getTime()) ? cursor : null,
  });

  return (
    <ProGate businessId={businessId} feature="payments">
      <div className={dashboardPageClass}>
        <DashboardPageHeader
          title="Payments"
          description="PayHere payment attempts and collected revenue."
          actions={
            <Link href="/dashboard/settings" className={dashboardPrimaryActionClass}>
              PayHere setup
            </Link>
          }
        />

        <DataTable
          rows={rows}
          getRowId={(row) => row.id}
          mobileCard={(row) => (
            <article key={row.id} className={cn(dashboardCardClass, "p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{row.clientName}</p>
                  <p className="text-sm text-muted-foreground">{row.serviceName}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-3 text-base font-semibold tabular-nums">{formatLkr(row.amountLkr)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.orderId ?? "—"}</p>
              <div className="mt-4 border-t pt-4">
                <Link
                  href={`/dashboard/bookings/${row.bookingId}`}
                  className={dashboardOutlineActionClass}
                >
                  Booking
                </Link>
              </div>
            </article>
          )}
          empty={
            <EmptyState
              icon={CreditCard}
              title="No payment records yet"
              description="Require payment on a service to collect deposits or full payment online."
              action={
                <Link href="/dashboard/settings" className={dashboardPrimaryActionClass}>
                  Set up PayHere
                </Link>
              }
            />
          }
          columns={[
            { key: "client", header: "Client", render: (row) => <span className="font-medium">{row.clientName}</span> },
            { key: "service", header: "Service", className: "text-muted-foreground", render: (row) => row.serviceName },
            { key: "amount", header: "Amount", render: (row) => <span className="tabular-nums">{formatLkr(row.amountLkr)}</span> },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: "order",
              header: "Order",
              className: "text-xs text-muted-foreground",
              render: (row) => row.orderId ?? "-",
            },
            {
              key: "link",
              header: "",
              align: "right",
              render: (row) => (
                <Link href={`/dashboard/bookings/${row.bookingId}`} className="text-primary hover:underline">
                  Booking
                </Link>
              ),
            },
          ]}
        />

        {hasMore && nextCursor ? (
          <div className="flex justify-center pt-2">
            <Link
              href={`/dashboard/payments?cursor=${encodeURIComponent(nextCursor)}`}
              className={dashboardOutlineActionClass}
            >
              Next page →
            </Link>
          </div>
        ) : null}
      </div>
    </ProGate>
  );
}
