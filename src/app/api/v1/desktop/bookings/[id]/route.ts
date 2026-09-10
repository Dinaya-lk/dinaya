import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, clients, services, staff } from "@/db/schema";
import { requireDesktopBookings, requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { updateDeviceBooking } from "@/lib/dashboard/device-bookings";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopBookings(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-booking-detail",
    limit: 240,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const [row] = await db
    .select({
      id: bookings.id,
      clientId: bookings.clientId,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      clientEmail: bookings.clientEmail,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      notes: bookings.notes,
      staffNotes: bookings.staffNotes,
      createdAt: bookings.createdAt,
      serviceName: services.name,
      staffName: staff.name,
      clientStage: clients.stage,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(staff, eq(bookings.staffId, staff.id))
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    notes: row.notes,
    staffNotes: row.staffNotes,
    createdAt: row.createdAt.toISOString(),
    serviceName: row.serviceName,
    staffName: row.staffName,
    clientStage: row.clientStage,
    webUrl: `/dashboard/bookings/${row.id}`,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId, keyType } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-booking-update",
    limit: 120,
    windowSeconds: 60,
  }, { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) });
  if (!limited.ok) return limited.response;

  const result = await updateDeviceBooking(
    businessId,
    id,
    await req.json().catch(() => null),
    { channel: keyType === "mobile" ? "mobile" : "desktop" },
  );

  switch (result.status) {
    case "updated":
      return NextResponse.json(result.booking);
    case "invalid":
      return NextResponse.json({ error: result.error }, { status: 400 });
    case "not_found":
      return NextResponse.json({ error: result.error }, { status: 404 });
    case "conflict":
      return NextResponse.json({ error: result.error }, { status: 409 });
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
