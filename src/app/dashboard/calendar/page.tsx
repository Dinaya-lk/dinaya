"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import {
  DashboardLoadingPanel,
  DashboardTableSkeleton,
} from "@/components/dashboard/DashboardLoadingPanel";
import { useDashboardToast } from "@/components/dashboard/ToastProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { statusSurfaceStyles } from "@/lib/dashboard-status";
import {
  dashboardCardClass,
  dashboardChromeClass,
  dashboardOutlineActionClass,
  dashboardPageClass,
  dashboardPrimaryActionClass,
  dashboardSurfaceClass,
} from "@/lib/dashboard-ui";
import {
  trackDashboardCalendarEventOpen,
  trackDashboardCalendarView,
} from "@/lib/analytics/gtag";
import { cn } from "@/lib/utils";
import { bookingReminderText, whatsappUrl } from "@/lib/whatsapp";
import {
  CALENDAR_START_HOUR as START_HOUR,
  CALENDAR_TOTAL_HOURS as TOTAL_HOURS,
  CALENDAR_HOUR_HEIGHT as HOUR_HEIGHT,
  topPercent,
  layoutOverlaps,
  cappedEventHeightPx,
} from "@/lib/calendar-layout";

type StaffMember = {
  id: string;
  name: string;
};

type Booking = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  endsAt: string;
  staffId: string;
  startsAt: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  serviceName: string;
  staffName: string;
};

type CalendarView = "day" | "agenda" | "week";

const STATUS_BG: Record<string, string> = {
  pending: statusSurfaceStyles.pending,
  confirmed: statusSurfaceStyles.confirmed,
  cancelled: `${statusSurfaceStyles.cancelled} opacity-60`,
  completed: statusSurfaceStyles.completed,
  no_show: `${statusSurfaceStyles.no_show} opacity-70`,
};

const navButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "min-h-11 min-w-11 px-3",
);

export default function CalendarPage() {
  const { showToast } = useDashboardToast();
  const [view, setView] = useState<CalendarView>("agenda");
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const hydratedView = useRef(false);

  // Prefer week on large screens once; never leave week active below lg
  useEffect(() => {
    if (hydratedView.current) return;
    hydratedView.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setView("week");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setView((v) => (!mq.matches && v === "week" ? "agenda" : v));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const rangeStart = view === "week" ? weekStart : selectedDay;
  const rangeEnd = useMemo(
    () => (view === "week" ? addDays(weekStart, 7) : addDays(selectedDay, 1)),
    [view, weekStart, selectedDay],
  );

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const from = rangeStart.toISOString();
    const to = rangeEnd.toISOString();
    const staffParam = selectedStaffId
      ? `&staffIds=${encodeURIComponent(selectedStaffId)}`
      : "";
    fetch(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${staffParam}`)
      .then((r) => r.json())
      .then((data) => {
        setBookings(data.bookings ?? []);
        if (data.staff?.length) {
          setStaffMembers(data.staff);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, [rangeStart, rangeEnd, selectedStaffId, reloadToken]);

  function bookingsForDay(day: Date) {
    return bookings
      .filter((b) => isSameDay(new Date(b.startsAt), day))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  const today = new Date();
  const dayBookings = bookingsForDay(selectedDay);

  function goToday() {
    const now = startOfDay(new Date());
    setSelectedDay(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
  }

  function changeView(next: CalendarView) {
    if (
      next === "week" &&
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 1024px)").matches
    ) {
      setView("agenda");
      trackDashboardCalendarView({ view: "agenda" });
      return;
    }
    setView(next);
    trackDashboardCalendarView({ view: next });
  }

  async function confirmBooking(bookingId: string) {
    if (updatingId) return;
    setUpdatingId(bookingId);
    try {
      const response = await fetch(`/api/dashboard/bookings/${bookingId}`, {
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
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: "confirmed" } : booking,
        ),
      );
    } catch {
      showToast({
        title: "Could not confirm booking",
        description: "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className={cn(dashboardPageClass, "flex h-full flex-col")}>
      <div
        className={cn(
          "sticky top-0 z-20 -mx-4 mb-4 space-y-3 border-b px-4 pb-3 pt-1 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:px-0 lg:pb-0 lg:pt-0",
          dashboardChromeClass,
          "lg:bg-transparent lg:backdrop-blur-none",
        )}
      >
        <DashboardPageHeader
          title="Calendar"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {staffMembers.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="sr-only">Filter by staff</span>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    aria-label="Filter by staff member"
                    className="min-h-11 rounded-md border bg-background px-3 py-2 text-base sm:text-sm"
                  >
                    <option value="">All staff</option>
                    {staffMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Link
                href="/dashboard/bookings"
                className={cn(dashboardOutlineActionClass, "hidden sm:inline-flex")}
              >
                List view
              </Link>
              <Link href="/dashboard/bookings/new" className={dashboardPrimaryActionClass}>
                New booking
              </Link>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                if (view === "week") setWeekStart((w) => subWeeks(w, 1));
                else setSelectedDay((d) => addDays(d, -1));
              }}
              aria-label={view === "week" ? "Previous week" : "Previous day"}
              className={navButtonClass}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={goToday} className={navButtonClass}>
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                if (view === "week") setWeekStart((w) => addWeeks(w, 1));
                else setSelectedDay((d) => addDays(d, 1));
              }}
              aria-label={view === "week" ? "Next week" : "Next day"}
              className={navButtonClass}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <span className="text-sm text-muted-foreground">
            {view === "week"
              ? `${format(weekStart, "d MMM")} – ${format(addDays(weekStart, 6), "d MMM yyyy")}`
              : format(selectedDay, "EEE d MMM yyyy")}
          </span>
          <div className={cn(dashboardCardClass, "ml-auto flex p-1")}>
            {(["day", "agenda", "week"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeView(option)}
                aria-pressed={view === option}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium capitalize transition-transform active:scale-[0.96] motion-reduce:active:scale-100",
                  view === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                  option === "week" && "hidden lg:inline-flex",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <p className="font-medium text-destructive">Could not load calendar</p>
          <p className="mt-1 text-muted-foreground">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className={cn(buttonVariants({ variant: "outline" }), "mt-4 min-h-11")}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <>
          <DashboardLoadingPanel className="lg:hidden" rows={6} />
          <div className="hidden lg:block">
            <DashboardTableSkeleton rows={8} />
          </div>
        </>
      ) : view === "agenda" ? (
        <div className={cn(dashboardSurfaceClass, "space-y-2 p-3")}>
          {dayBookings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No bookings on {format(selectedDay, "d MMM")}.
              </p>
              <Link href="/dashboard/bookings/new" className={dashboardPrimaryActionClass}>
                Create booking
              </Link>
            </div>
          ) : (
            dayBookings.map((b) => (
              <article
                key={b.id}
                className={cn("rounded-lg border px-3 py-3", STATUS_BG[b.status])}
              >
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  onClick={() => trackDashboardCalendarEventOpen({ bookingId: b.id })}
                  className="flex min-h-14 items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.clientName}</p>
                    <p className="truncate text-sm opacity-80">
                      {b.serviceName}
                      <span className="ml-1.5 capitalize opacity-70">· {b.status.replace("_", " ")}</span>
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">
                    {format(new Date(b.startsAt), "h:mm a")}
                  </p>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {b.status === "pending" ? (
                    <Button
                      type="button"
                      variant="default"
                      disabled={updatingId === b.id}
                      className="min-h-11"
                      onClick={() => void confirmBooking(b.id)}
                    >
                      {updatingId === b.id ? "Updating…" : "Confirm"}
                    </Button>
                  ) : null}
                  <a
                    href={whatsappUrl(
                      b.clientPhone,
                      bookingReminderText({
                        clientName: b.clientName,
                        serviceName: b.serviceName,
                        startsAt: b.startsAt,
                      }),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
                  >
                    WhatsApp
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      ) : view === "day" ? (
        <div className={cn(dashboardSurfaceClass, "relative flex-1 overflow-auto")}>
          {dayBookings.length === 0 ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-card/90 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                No bookings on {format(selectedDay, "d MMM")}.
              </p>
              <Link href="/dashboard/bookings/new" className={dashboardPrimaryActionClass}>
                Create booking
              </Link>
            </div>
          ) : null}
          <div className="grid grid-cols-[48px_1fr]">
            <div className="border-r border-border/60">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  style={{ height: HOUR_HEIGHT }}
                  className="flex items-start justify-end border-b border-border/60 pr-2 pt-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {format(new Date().setHours(START_HOUR + i, 0, 0, 0), "h a")}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-b border-muted/40"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {(() => {
                const laidOut = layoutOverlaps(dayBookings);
                return laidOut.map((b) => {
                const top = topPercent(b.startsAt);
                const height = cappedEventHeightPx(laidOut, b);
                const widthPct = 100 / b.totalCols;
                return (
                  <Link
                    key={b.id}
                    href={`/dashboard/bookings/${b.id}`}
                    onClick={() => trackDashboardCalendarEventOpen({ bookingId: b.id })}
                    className={`absolute z-20 flex flex-col justify-center overflow-hidden rounded-md border px-2 py-1 text-sm shadow-sm transition-[opacity,box-shadow] hover:z-30 hover:shadow-md active:opacity-80 ${STATUS_BG[b.status]}`}
                    style={{
                      top: `${top}%`,
                      height,
                      left: `calc(${b.col * widthPct}% + 0.5rem)`,
                      width: `calc(${widthPct}% - ${b.totalCols > 1 ? "0.25rem" : "1rem"})`,
                    }}
                  >
                    <p className="truncate font-medium">{b.clientName}</p>
                    <p className="truncate opacity-75">
                      <span className="tabular-nums">{format(new Date(b.startsAt), "h:mm a")}</span>
                      {" · "}
                      {b.serviceName}
                    </p>
                  </Link>
                );
                });
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn(dashboardSurfaceClass, "flex-1 overflow-auto")}>
          <div className="sticky top-0 z-10 grid grid-cols-[48px_repeat(7,1fr)] border-b bg-card">
            <div className="border-r" />
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    changeView("day");
                  }}
                  className="border-r px-2 py-3 text-center last:border-0"
                >
                  <p className="text-xs uppercase text-muted-foreground">{format(day, "EEE")}</p>
                  <p
                    className={`mx-auto mt-0.5 flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {format(day, "d")}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[48px_repeat(7,1fr)]">
            <div className="border-r">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  style={{ height: HOUR_HEIGHT }}
                  className="flex items-start justify-end border-b pr-2 pt-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {format(new Date().setHours(START_HOUR + i, 0, 0, 0), "h a")}
                  </span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const columnBookings = bookingsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-r last:border-0"
                  style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                >
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-b border-muted/40"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {isSameDay(day, today)
                    ? (() => {
                        const pct = topPercent(new Date().toISOString());
                        if (pct < 0 || pct > 100) return null;
                        return (
                          <div
                            className="absolute z-10 flex w-full items-center"
                            style={{ top: `${pct}%` }}
                          >
                            <div className="-ml-1 h-2 w-2 rounded-full bg-primary" />
                            <div className="h-px flex-1 bg-primary" />
                          </div>
                        );
                      })()
                    : null}

                  {(() => {
                    const laidOut = layoutOverlaps(columnBookings);
                    return laidOut.map((b) => {
                    const top = topPercent(b.startsAt);
                    const height = cappedEventHeightPx(laidOut, b);
                    const widthPct = 100 / b.totalCols;
                    return (
                      <Link
                        key={b.id}
                        href={`/dashboard/bookings/${b.id}`}
                        onClick={() => trackDashboardCalendarEventOpen({ bookingId: b.id })}
                        className={`absolute z-20 flex flex-col justify-center overflow-hidden rounded-md border px-1.5 py-1 text-xs shadow-sm transition-[box-shadow] hover:z-30 hover:shadow-md ${STATUS_BG[b.status]}`}
                        style={{
                          top: `${top}%`,
                          height,
                          left: `calc(${b.col * widthPct}% + 0.25rem)`,
                          width: `calc(${widthPct}% - ${b.totalCols > 1 ? "0.125rem" : "0.5rem"})`,
                        }}
                        title={`${b.clientName} · ${b.serviceName}`}
                      >
                        <p className="truncate font-medium">{b.clientName}</p>
                        <p className="truncate opacity-75">{b.serviceName}</p>
                      </Link>
                    );
                    });
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
