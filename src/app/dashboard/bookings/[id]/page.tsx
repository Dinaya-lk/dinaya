"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BookingRefundPanel, type BookingPaymentSummary } from "@/components/dashboard/BookingRefundPanel";
import { BookingReschedulePanel } from "@/components/dashboard/BookingReschedulePanel";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { DashboardLoadingPanel } from "@/components/dashboard/DashboardLoadingPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import {
  dashboardInputClass,
  dashboardOutlineActionClass,
  dashboardPageClass,
  dashboardSectionClass,
} from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { bookingReminderText, whatsappUrl } from "@/lib/whatsapp";
import type { IntakeAnswer } from "@/lib/intake";

type Booking = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
  staffNotes: string | null;
  intakeAnswers: IntakeAnswer[] | null;
  serviceName: string;
  serviceDuration: number;
  staffName: string;
  clientStage: string | null;
  createdAt: string;
  payment: BookingPaymentSummary | null;
};

type BookingStatus = Booking["status"];

type BookingAction = {
  label: string;
  next: BookingStatus;
  variant?: "default" | "destructive" | "outline";
};

const ACTIONS: Record<string, BookingAction[]> = {
  pending: [
    { label: "Confirm", next: "confirmed", variant: "default" },
    { label: "Cancel", next: "cancelled", variant: "destructive" },
  ],
  confirmed: [
    { label: "Mark complete", next: "completed", variant: "default" },
    { label: "No-show", next: "no_show", variant: "outline" },
    { label: "Cancel", next: "cancelled", variant: "destructive" },
  ],
};

const DESTRUCTIVE_ACTIONS = new Set<BookingStatus>(["cancelled", "no_show"]);

const CONFIRM_COPY: Record<
  string,
  { title: string; description: string; confirmLabel: string; variant?: "destructive" | "default" }
> = {
  cancelled: {
    title: "Cancel this booking?",
    description: "The client will no longer have this appointment.",
    confirmLabel: "Cancel booking",
    variant: "destructive",
  },
  no_show: {
    title: "Mark as no-show?",
    description: "This records that the client did not attend.",
    confirmLabel: "Mark no-show",
    variant: "default",
  },
};

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffNotes, setStaffNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<BookingStatus | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBooking(data);
        setStaffNotes(data.staffNotes ?? "");
        setLoading(false);
      });
  }, [id]);

  async function updateStatus(status: BookingStatus) {
    setUpdatingStatus(true);
    const res = await fetch(`/api/dashboard/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBooking((b) => (b ? { ...b, status: updated.status } : b));
    }
    setUpdatingStatus(false);
  }

  function handleStatusAction(status: BookingStatus) {
    if (DESTRUCTIVE_ACTIONS.has(status)) {
      setConfirmStatus(status);
      return;
    }
    void updateStatus(status);
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/dashboard/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffNotes }),
    });
    setSavingNotes(false);
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  }

  if (loading) {
    return (
      <div className={dashboardPageClass}>
        <DashboardLoadingPanel rows={3} />
      </div>
    );
  }
  if (!booking) {
    return <div className="p-8 text-sm text-muted-foreground">Booking not found.</div>;
  }

  const actions = ACTIONS[booking.status] ?? [];
  const waText = bookingReminderText({
    clientName: booking.clientName,
    serviceName: booking.serviceName,
    startsAt: booking.startsAt,
  });

  return (
    <div className={cn(dashboardPageClass, "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0")}>
      <DashboardPageHeader
        backHref="/dashboard/bookings"
        backLabel="Bookings"
        title={booking.clientName}
        actions={<StatusBadge status={booking.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className={cn(dashboardSectionClass, "space-y-4")}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Appointment
            </p>
            <div className="flex items-start gap-2.5">
              <Icon name="calendar" className="mt-0.5 shrink-0 text-sm text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {format(new Date(booking.startsAt), "EEEE, d MMM yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(booking.startsAt), "h:mm a")} —{" "}
                  {format(new Date(booking.endsAt), "h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Icon name="scissors" className="mt-0.5 shrink-0 text-sm text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{booking.serviceName}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name="clock" /> {booking.serviceDuration} min
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Icon name="person" className="mt-0.5 shrink-0 text-sm text-muted-foreground" />
              <p className="text-sm font-medium">{booking.staffName}</p>
            </div>
          </div>

          <div className={cn(dashboardSectionClass, "space-y-3")}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Client
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Icon name="telephone" className="shrink-0 text-xs text-muted-foreground" />
              <span className="font-medium">{booking.clientPhone}</span>
            </div>
            {booking.clientEmail ? (
              <div className="flex items-center gap-2 text-sm">
                <Icon name="envelope" className="shrink-0 text-xs text-muted-foreground" />
                <span className="font-medium">{booking.clientEmail}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {booking.clientId ? (
                <Link
                  href={`/dashboard/clients/${booking.clientId}`}
                  className={cn(dashboardOutlineActionClass, "text-xs")}
                >
                  CRM profile →
                </Link>
              ) : null}
              <a
                href={whatsappUrl(booking.clientPhone, waText)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  dashboardOutlineActionClass,
                  "hidden border-green-200 text-green-700 hover:bg-green-50 md:inline-flex dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/40",
                )}
              >
                <Icon name="chat-square" className="text-xs" /> WhatsApp
              </a>
            </div>
          </div>

          <BookingReschedulePanel
            bookingId={booking.id}
            serviceDuration={booking.serviceDuration}
            canReschedule={booking.status === "pending" || booking.status === "confirmed"}
            currentStartsAt={booking.startsAt}
          />

          {booking.payment ? (
            <BookingRefundPanel
              bookingId={booking.id}
              payment={booking.payment}
              onUpdated={(payment) => setBooking((current) => (current ? { ...current, payment } : current))}
            />
          ) : null}

          {actions.length > 0 ? (
            <div className={cn(dashboardSectionClass, "space-y-2")}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Actions
              </p>
              {actions.map((a) => (
                <Button
                  key={a.next}
                  type="button"
                  variant={a.variant ?? "outline"}
                  className={cn("min-h-11 w-full", a.next === "confirmed" && "hidden md:inline-flex")}
                  onClick={() => handleStatusAction(a.next)}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? "Updating…" : a.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5 lg:col-span-2">
          {booking.notes ? (
            <div className={dashboardSectionClass}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Client note
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{booking.notes}</p>
            </div>
          ) : null}

          {booking.intakeAnswers && booking.intakeAnswers.length > 0 ? (
            <div className={dashboardSectionClass}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Intake answers
              </p>
              <dl className="space-y-3">
                {booking.intakeAnswers.map((a) => (
                  <div key={a.questionId}>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {a.label}
                      {a.sensitive ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                          Sensitive
                        </span>
                      ) : null}
                    </dt>
                    <dd className="whitespace-pre-wrap text-sm text-foreground">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className={dashboardSectionClass}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Staff notes
            </p>
            <textarea
              rows={6}
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder="Add internal notes about this appointment…"
              className={cn(dashboardInputClass, "mt-0 resize-none")}
            />
            <div className="mt-2 flex items-center gap-3">
              <Button type="button" onClick={saveNotes} disabled={savingNotes} className="min-h-11">
                {savingNotes ? "Saving…" : "Save notes"}
              </Button>
              {savedNotes ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <Icon name="check-circle" className="text-sm" /> Saved
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {booking.status === "pending" || booking.clientPhone ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-4 flex gap-2 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <a
            href={whatsappUrl(booking.clientPhone, waText)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(dashboardOutlineActionClass, "min-h-11 flex-1 justify-center")}
          >
            WhatsApp
          </a>
          {booking.status === "pending" ? (
            <Button
              type="button"
              className="min-h-11 flex-1"
              onClick={() => handleStatusAction("confirmed")}
              disabled={updatingStatus}
            >
              {updatingStatus ? "Updating…" : "Confirm"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {confirmStatus && CONFIRM_COPY[confirmStatus] ? (
        <DashboardConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmStatus(null);
          }}
          title={CONFIRM_COPY[confirmStatus].title}
          description={CONFIRM_COPY[confirmStatus].description}
          confirmLabel={CONFIRM_COPY[confirmStatus].confirmLabel}
          variant={CONFIRM_COPY[confirmStatus].variant}
          onConfirm={() => updateStatus(confirmStatus)}
        />
      ) : null}
    </div>
  );
}
