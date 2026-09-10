import { NextRequest, NextResponse } from "next/server";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { requireDesktopBookings } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { bookings, businesses, locations, services, staff } from "@/db/schema";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";

const DEFAULT_TIMEZONE = "Asia/Colombo";
const VALID_VIEWS = ["day", "week"] as const;

function parseLocalDate(raw: string | null): Date | null {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopBookings(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-calendar-read",
    limit: 240,
    windowSeconds: 60,
  }, { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) });
  if (!limited.ok) return limited.response;

  const params = req.nextUrl.searchParams;
  const viewRaw = params.get("view") ?? "day";
  const view = VALID_VIEWS.includes(viewRaw as (typeof VALID_VIEWS)[number])
    ? (viewRaw as (typeof VALID_VIEWS)[number])
    : "day";
  const staffId = params.get("staffId");
  const requestedLocalDate = parseLocalDate(params.get("date"));
  if (params.get("date") && !requestedLocalDate) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
  }

  const [business] = await db
    .select({ timezone: businesses.timezone })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
  const now = new Date();
  const localTarget = requestedLocalDate ?? toZonedTime(now, timezone);
  const rangeLocalStart = view === "week"
    ? startOfWeek(localTarget, { weekStartsOn: 1 })
    : startOfDay(localTarget);
  const rangeLocalEnd = addDays(rangeLocalStart, view === "week" ? 7 : 1);
  const rangeStart = fromZonedTime(rangeLocalStart, timezone);
  const rangeEnd = fromZonedTime(rangeLocalEnd, timezone);

  const filters = [
    eq(bookings.businessId, businessId),
    gte(bookings.startsAt, rangeStart),
    lt(bookings.startsAt, rangeEnd),
    ...(staffId ? [eq(bookings.staffId, staffId)] : []),
  ];

  const [staffRows, rows] = await Promise.all([
    db
      .select({
        id: staff.id,
        isActive: staff.isActive,
        name: staff.name,
      })
      .from(staff)
      .where(and(eq(staff.businessId, businessId), eq(staff.isActive, true)))
      .orderBy(asc(staff.name)),
    db
      .select({
        id: bookings.id,
        clientName: bookings.clientName,
        clientPhone: bookings.clientPhone,
        clientEmail: bookings.clientEmail,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        createdAt: bookings.createdAt,
        serviceName: services.name,
        staffId: bookings.staffId,
        staffName: staff.name,
        locationName: locations.name,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(staff, eq(bookings.staffId, staff.id))
      .leftJoin(locations, eq(bookings.locationId, locations.id))
      .where(and(...filters))
      .orderBy(asc(bookings.startsAt))
      .limit(240),
  ]);

  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, index) => {
    const localDay = addDays(rangeLocalStart, index);
    return {
      date: format(localDay, "yyyy-MM-dd"),
      label: format(localDay, "EEE, MMM d"),
    };
  });

  return NextResponse.json({
    date: format(localTarget, "yyyy-MM-dd"),
    days,
    rangeEnd: rangeEnd.toISOString(),
    rangeStart: rangeStart.toISOString(),
    rows: rows.map((row) => ({
      id: row.id,
      clientName: row.clientName,
      clientPhone: row.clientPhone,
      clientEmail: row.clientEmail,
      serviceName: row.serviceName,
      staffId: row.staffId,
      staffName: row.staffName,
      locationName: row.locationName,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      status: row.status,
      revisionTs: row.createdAt.toISOString(),
      webUrl: `/dashboard/bookings/${row.id}`,
    })),
    serverTime: now.toISOString(),
    staff: staffRows,
    timezone,
    view,
  });
}
