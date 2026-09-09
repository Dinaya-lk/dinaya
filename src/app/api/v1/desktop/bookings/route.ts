import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, gte, ilike, lt, ne, or } from "drizzle-orm";
import { endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { db } from "@/db";
import { bookings, businesses, payments, services, staff } from "@/db/schema";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";
import { requireDesktopBookings } from "@/app/api/v1/desktop/_shared";

const VALID_TABS = ["upcoming", "today", "past", "cancelled", "all"] as const;
const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const DEFAULT_TIMEZONE = "Asia/Colombo";

function parseDateValue(raw: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopBookings(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-bookings-read",
    limit: 240,
    windowSeconds: 60,
  }, { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) });
  if (!limited.ok) return limited.response;

  const params = req.nextUrl.searchParams;
  const tabRaw = params.get("tab") ?? "upcoming";
  const tab = VALID_TABS.includes(tabRaw as (typeof VALID_TABS)[number])
    ? (tabRaw as (typeof VALID_TABS)[number])
    : "upcoming";
  const webCompat = params.get("compat") === "web";

  const parsedLimit = Number(params.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.round(parsedLimit)))
    : DEFAULT_LIMIT;

  const cursor = parseDateValue(params.get("cursor"));
  if (params.get("cursor") && !cursor) {
    return NextResponse.json({ error: "cursor must be a valid ISO datetime." }, { status: 400 });
  }

  const since = parseDateValue(params.get("since"));
  if (params.get("since") && !since) {
    return NextResponse.json({ error: "since must be a valid ISO datetime." }, { status: 400 });
  }

  const statusParam = params.get("status");
  if (statusParam && !VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  const query = params.get("q")?.trim();
  const staffId = params.get("staffId");

  const [business] = await db
    .select({ timezone: businesses.timezone })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
  const now = new Date();
  const localNow = toZonedTime(now, timezone);
  const dayStart = fromZonedTime(startOfDay(localNow), timezone);
  const dayEnd = fromZonedTime(endOfDay(localNow), timezone);

  const filters = [
    eq(bookings.businessId, businessId),
    ...(tab === "upcoming" ? [gte(bookings.startsAt, now), ne(bookings.status, "cancelled")] : []),
    ...(tab === "today" ? [gte(bookings.startsAt, dayStart), lt(bookings.startsAt, dayEnd)] : []),
    ...(tab === "past" ? [lt(bookings.startsAt, now), ne(bookings.status, "cancelled")] : []),
    ...(tab === "cancelled" ? [eq(bookings.status, "cancelled")] : []),
    ...(cursor
      ? [tab === "past" ? lt(bookings.startsAt, cursor) : gte(bookings.startsAt, cursor)]
      : []),
    ...(since ? [gte(bookings.createdAt, since)] : []),
    ...(statusParam ? [eq(bookings.status, statusParam as (typeof VALID_STATUSES)[number])] : []),
    ...(staffId ? [eq(bookings.staffId, staffId)] : []),
    ...(query
      ? [
          or(
            ilike(bookings.clientName, `%${query}%`),
            ilike(bookings.clientPhone, `%${query}%`),
            ilike(bookings.clientEmail, `%${query}%`),
          ),
        ]
      : []),
  ];

  const rows = await db
    .select({
      id: bookings.id,
      clientId: bookings.clientId,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      clientEmail: bookings.clientEmail,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      source: bookings.source,
      createdAt: bookings.createdAt,
      amountLkr: payments.amountLkr,
      paymentStatus: payments.status,
      serviceName: services.name,
      staffId: bookings.staffId,
      staffName: staff.name,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(staff, eq(bookings.staffId, staff.id))
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(...filters))
    .orderBy(tab === "upcoming" || tab === "today" || tab === "all" ? asc(bookings.startsAt) : desc(bookings.startsAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.startsAt.toISOString() : null;

  const mappedRows = page.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    amountLkr: row.amountLkr,
    paymentStatus: row.paymentStatus,
    source: row.source,
    serviceName: row.serviceName,
    staffId: row.staffId,
    staffName: row.staffName,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    revisionTs: row.createdAt.toISOString(),
    webUrl: `/dashboard/bookings/${row.id}`,
  }));

  if (webCompat) {
    return NextResponse.json(mappedRows);
  }

  return NextResponse.json({
    tab,
    limit,
    nextCursor,
    serverTime: now.toISOString(),
    rows: mappedRows,
  });
}
