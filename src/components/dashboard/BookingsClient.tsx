"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarPlus, Download } from "lucide-react";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { DashboardLoadingPanel, DashboardTableSkeleton } from "@/components/dashboard/DashboardLoadingPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useDashboardToast } from "@/components/dashboard/ToastProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  dashboardFilterPillClass,
  dashboardCardClass,
  dashboardOutlineActionClass,
  dashboardPrimaryActionClass,
} from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { bookingReminderText, whatsappUrl } from "@/lib/whatsapp";

export type BookingRow = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  amountLkr: number | null;
  paymentStatus: "pending" | "success" | "failed" | "refunded" | null;
  source: string;
  startsAt: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  serviceName: string;
  staffName: string;
};

const TABS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

export type BookingsTab = (typeof TABS)[number]["key"];

type BookingAction = {
  label: string;
  next: BookingRow["status"];
  variant?: "default" | "destructive" | "outline";
};

const ACTIONS: Record<string, BookingAction[]> = {
  pending: [
    { label: "Confirm", next: "confirmed", variant: "default" },
    { label: "Cancel", next: "cancelled", variant: "destructive" },
  ],
  confirmed: [
    { label: "Complete", next: "completed", variant: "default" },
    { label: "No-show", next: "no_show", variant: "outline" },
    { label: "Cancel", next: "cancelled", variant: "destructive" },
  ],
};

const DESTRUCTIVE_ACTIONS = new Set<BookingRow["status"]>(["cancelled", "no_show"]);

const CONFIRM_COPY: Record<
  string,
  { title: string; description: string; confirmLabel: string; variant?: "destructive" | "default" }
> = {
  cancelled: {
    title: "Cancel this booking?",
    description: "The client will no longer have this appointment. You can still view it under Cancelled.",
    confirmLabel: "Cancel booking",
    variant: "destructive",
  },
  no_show: {
    title: "Mark as no-show?",
    description: "This records that the client did not attend. The booking stays in your history.",
    confirmLabel: "Mark no-show",
    variant: "default",
  },
};

export type BookingsPage = {
  bookings: BookingRow[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type BookingsApi = {
  list: (tab: BookingsTab, cursor?: string | null) => Promise<BookingsPage>;
  updateStatus: (bookingId: string, status: string) => Promise<{ status: BookingRow["status"] } | null>;
  exportUrl: (tab: BookingsTab) => string;
};


function BookingActions({
  row,
  updating,
  onAction,
  compact = false,
}: {
  row: BookingRow;
  updating: string | null;
  onAction: (bookingId: string, status: BookingRow["status"]) => void;
  /** Mobile cards: hide View (card is tappable) and cap status actions */
  compact?: boolean;
}) {
  const actions = ACTIONS[row.status] ?? [];
  const visibleActions = compact ? actions.slice(0, 2) : actions;
  const isUpdating = updating === row.id;
  const actionClass = "min-h-11";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!compact ? (
        <Link
          href={`/dashboard/bookings/${row.id}`}
          className={cn(buttonVariants({ variant: "outline" }), actionClass)}
        >
          View
        </Link>
      ) : null}
      <a
        href={whatsappUrl(
          row.clientPhone,
          bookingReminderText({
            clientName: row.clientName,
            serviceName: row.serviceName,
            startsAt: row.startsAt,
          }),
        )}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline" }), actionClass)}
      >
        WhatsApp
      </a>
      {visibleActions.map((action) => (
        <Button
          key={action.next}
          type="button"
          variant={action.variant ?? "outline"}
          disabled={isUpdating}
          className={actionClass}
          onClick={() => onAction(row.id, action.next)}
        >
          {isUpdating ? "Updating…" : action.label}
        </Button>
      ))}
    </div>
  );
}

export function BookingsClient({ api }: { api: BookingsApi }) {
  const { showToast } = useDashboardToast();
  const [tab, setTab] = useState<BookingsTab>("today");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    bookingId: string;
    status: BookingRow["status"];
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    void api
      .list(tab)
      .then((page) => {
        setRows(page.bookings);
        setHasMore(page.hasMore);
        setCursor(page.nextCursor);
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setHasMore(false);
        setCursor(null);
        setLoading(false);
        showToast({
          title: "Could not load bookings",
          description: "Check your connection and try again.",
          variant: "error",
        });
      });
  }, [api, tab, showToast]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api.list(tab, cursor);
      setRows((prev) => [...prev, ...page.bookings]);
      setHasMore(page.hasMore);
      setCursor(page.nextCursor);
    } catch {
      showToast({
        title: "Could not load more bookings",
        description: "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setLoadingMore(false);
    }
  }

  async function updateStatus(bookingId: string, status: BookingRow["status"]) {
    setUpdating(bookingId);
    try {
      const updated = await api.updateStatus(bookingId, status);
      if (updated) {
        setRows((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: updated.status } : b)));
        showToast({ title: "Booking updated" });
      } else {
        showToast({
          title: "Could not update booking",
          description: "Try again or refresh the page.",
          variant: "error",
        });
      }
    } catch {
      showToast({
        title: "Could not update booking",
        description: "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setUpdating(null);
    }
  }

  function handleAction(bookingId: string, status: BookingRow["status"]) {
    if (DESTRUCTIVE_ACTIONS.has(status)) {
      setConfirmState({ bookingId, status });
      return;
    }
    void updateStatus(bookingId, status);
  }

  const confirmCopy = confirmState ? CONFIRM_COPY[confirmState.status] : null;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Bookings"
        description="Confirm, message, and close out today’s appointments."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/bookings/new"
              className={cn(dashboardPrimaryActionClass, "w-full justify-center sm:w-auto")}
            >
              New booking
            </Link>
            <a href={api.exportUrl(tab)} className={cn(dashboardOutlineActionClass, "justify-center")}>
              <Download className="size-3.5" aria-hidden="true" />
              Export
            </a>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Booking filters">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={dashboardFilterPillClass(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <>
          <DashboardLoadingPanel className="md:hidden" rows={4} />
          <div className="hidden md:block">
            <DashboardTableSkeleton />
          </div>
        </>
      ) : (
        <DataTable
          rows={rows}
          getRowId={(row) => row.id}
          mobileCard={(row) => (
            <article
              key={row.id}
              className={cn(dashboardCardClass, "p-4")}
            >
              <Link
                href={`/dashboard/bookings/${row.id}`}
                className="block -m-1 rounded-lg p-1 active:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{row.clientName}</p>
                    <p className="text-sm text-muted-foreground">{row.clientPhone}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2 sm:gap-x-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Service</dt>
                    <dd>{row.serviceName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Staff</dt>
                    <dd>{row.staffName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">When</dt>
                    <dd className="tabular-nums">
                      {format(new Date(row.startsAt), "d MMM yyyy, h:mm a")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Payment</dt>
                    <dd>
                      {row.amountLkr ? `LKR ${row.amountLkr.toLocaleString()}` : "—"}
                      {row.paymentStatus ? (
                        <span className="block text-xs capitalize text-muted-foreground">
                          {row.paymentStatus}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </Link>
              <div className="mt-4 border-t pt-4">
                <BookingActions
                  row={row}
                  updating={updating}
                  onAction={handleAction}
                  compact
                />
              </div>
            </article>
          )}
          empty={
            <EmptyState
              icon={CalendarPlus}
              title="No bookings here yet"
              description="New bookings from your booking page or manual entries will appear here."
              action={
                <Link href="/dashboard/bookings/new" className={dashboardPrimaryActionClass}>
                  Create booking
                </Link>
              }
            />
          }
          columns={[
            {
              key: "client",
              header: "Client",
              render: (row) => (
                <>
                  {row.clientId ? (
                    <Link
                      href={`/dashboard/clients/${row.clientId}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {row.clientName}
                    </Link>
                  ) : (
                    <p className="font-medium">{row.clientName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{row.clientPhone}</p>
                </>
              ),
            },
            { key: "service", header: "Service", render: (row) => row.serviceName },
            { key: "staff", header: "Staff", render: (row) => row.staffName },
            {
              key: "datetime",
              header: "Date & Time",
              render: (row) => (
                <>
                  <p>{format(new Date(row.startsAt), "d MMM yyyy")}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(row.startsAt), "h:mm a")}</p>
                </>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: "payment",
              header: "Payment",
              render: (row) => (
                <>
                  <p className="tabular-nums">{row.amountLkr ? `LKR ${row.amountLkr.toLocaleString()}` : "-"}</p>
                  {row.paymentStatus ? (
                    <p className="text-xs capitalize text-muted-foreground">{row.paymentStatus}</p>
                  ) : null}
                </>
              ),
            },
            {
              key: "source",
              header: "Source",
              className: "text-muted-foreground",
              render: (row) => <span className="text-xs capitalize">{row.source}</span>,
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (row) => (
                <BookingActions row={row} updating={updating} onAction={handleAction} />
              ),
            },
          ]}
        />
      )}

      {!loading && hasMore ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      {confirmState && confirmCopy ? (
        <DashboardConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmState(null);
          }}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          variant={confirmCopy.variant}
          onConfirm={() => updateStatus(confirmState.bookingId, confirmState.status)}
        />
      ) : null}
    </div>
  );
}
