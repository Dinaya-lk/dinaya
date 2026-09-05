"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useDashboardToast } from "@/components/dashboard/ToastProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { statusBorderStyles } from "@/lib/dashboard-status";
import { cn } from "@/lib/utils";
import { bookingReminderText, whatsappUrl } from "@/lib/whatsapp";

type DashboardTodayRowProps = {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  staffName: string;
  startsAt: Date | string;
  status: string;
};

export function DashboardTodayRow({
  id,
  clientName,
  clientPhone,
  serviceName,
  staffName,
  startsAt,
  status: initialStatus,
}: DashboardTodayRowProps) {
  const { showToast } = useDashboardToast();
  const [status, setStatus] = useState(initialStatus);
  const [updating, setUpdating] = useState(false);

  const initials = clientName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const border = statusBorderStyles[status] ?? "border-l-border";
  const startsAtDate = typeof startsAt === "string" ? new Date(startsAt) : startsAt;

  async function confirmBooking() {
    if (updating) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/dashboard/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (!response.ok) {
        let description = "Try again or refresh the page.";
        try {
          const body = (await response.json()) as { error?: string };
          if (typeof body.error === "string") description = body.error;
        } catch {
          /* keep default */
        }
        showToast({
          title: "Could not confirm booking",
          description,
          variant: "error",
        });
        return;
      }
      setStatus("confirmed");
    } catch {
      showToast({
        title: "Could not confirm booking",
        description: "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <li>
      <div className={cn("rounded-xl border-l-[3px] px-3 py-3 sm:px-4", border)}>
        <Link
          href={`/dashboard/bookings/${id}`}
          className="flex min-h-14 items-center gap-3 rounded-lg transition-colors hover:bg-muted/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {initials}
          </span>
          <span className="w-[4.5rem] shrink-0 text-base font-semibold tabular-nums tracking-tight">
            {format(startsAtDate, "h:mm a")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{clientName}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {serviceName} · {staffName}
            </span>
          </span>
          <StatusBadge status={status} className="shrink-0" />
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {status === "pending" ? (
            <Button
              type="button"
              variant="default"
              disabled={updating}
              className="min-h-11"
              onClick={() => void confirmBooking()}
            >
              {updating ? "Updating…" : "Confirm"}
            </Button>
          ) : null}
          <a
            href={whatsappUrl(
              clientPhone,
              bookingReminderText({
                clientName,
                serviceName,
                startsAt: startsAtDate,
              }),
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
          >
            WhatsApp
          </a>
        </div>
      </div>
    </li>
  );
}
