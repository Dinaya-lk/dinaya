import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";
import { requireDesktopBookings } from "@/app/api/v1/desktop/_shared";
import { z } from "@/lib/validation";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;
type BookingStatus = (typeof VALID_STATUSES)[number];

const patchSchema = z.object({
  status: z.enum(VALID_STATUSES),
});

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  cancelled: [],
  completed: [],
  no_show: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopBookings(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId, keyId, keyType } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-booking-mutation",
    limit: 120,
    windowSeconds: 60,
  }, { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) });
  if (!limited.ok) return limited.response;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the status update payload." },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
    })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const nextStatus = parsed.data.status as BookingStatus;
  if (existing.status !== nextStatus) {
    const allowed = ALLOWED_TRANSITIONS[existing.status].includes(nextStatus);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Cannot change a ${existing.status.replace("_", " ")} booking to ${nextStatus.replace("_", " ")}.`,
        },
        { status: 400 },
      );
    }
  }

  if (existing.status === "pending" && nextStatus === "confirmed") {
    const [unpaidPayment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.bookingId, id), eq(payments.status, "pending")))
      .limit(1);

    if (unpaidPayment) {
      return NextResponse.json(
        { error: "This booking has an unpaid PayHere payment and cannot be confirmed yet." },
        { status: 400 },
      );
    }
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: nextStatus })
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .returning({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      createdAt: bookings.createdAt,
    });

  if (!updated) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (existing.status !== updated.status) {
    void logActivity({
      businessId,
      actorUserId: null,
      entity: "booking",
      entityId: updated.id,
      action: "status_changed_desktop",
      meta: {
        actor: `${keyType === "mobile" ? "mobile" : "desktop"}:${deviceId ?? keyId}`,
        from: existing.status,
        to: updated.status,
      },
    }).catch((error) => {
      console.error("Desktop activity log write failed:", error);
    });
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt.toISOString(),
    revisionTs: updated.createdAt.toISOString(),
  });
}
