import { NextRequest, NextResponse } from "next/server";
import { requireApiBusiness } from "@/lib/api-auth";
import { db } from "@/db";
import { bookings, services, staff, clients, payments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logActivity } from "@/lib/activity-log";
import { rescheduleBooking } from "@/lib/booking-reschedule";
import { processBookingAutomationTrigger } from "@/lib/automations/engine";
import { releaseDealSlotForBooking } from "@/lib/deals/claim";
import { z } from "@/lib/validation";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;
type BookingStatus = (typeof VALID_STATUSES)[number];

const patchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  staffNotes: z.string().max(5000).optional().nullable(),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().optional(),
});

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  cancelled: [],
  completed: [],
  no_show: [],
};

export async function GET(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiBusiness({ req });
  if (!authResult.ok) return authResult.response;
  const { businessId } = authResult.context;
  const { id } = await params;

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
      intakeAnswers: bookings.intakeAnswers,
      createdAt: bookings.createdAt,
      serviceName: services.name,
      serviceDuration: services.durationMinutes,
      staffName: staff.name,
      clientStage: clients.stage,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(staff, eq(bookings.staffId, staff.id))
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const [payment] = await db
    .select({
      id: payments.id,
      amountLkr: payments.amountLkr,
      refundedAmountLkr: payments.refundedAmountLkr,
      status: payments.status,
      provider: payments.provider,
      payhereOrderId: payments.payhereOrderId,
      providerOrderId: payments.providerOrderId,
    })
    .from(payments)
    .where(eq(payments.bookingId, id))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return NextResponse.json({
    ...row,
    payment: payment
      ? {
          id: payment.id,
          amountLkr: payment.amountLkr,
          refundedAmountLkr: payment.refundedAmountLkr,
          status: payment.status,
          provider: payment.provider,
          orderId: payment.payhereOrderId ?? payment.providerOrderId,
        }
      : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiBusiness({ req });
  if (!authResult.ok) return authResult.response;
  const { businessId, user } = authResult.context;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the booking update.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { status, staffNotes, startsAt, endsAt } = parsed.data;

  const [existing] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
    })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if ((startsAt && !endsAt) || (!startsAt && endsAt)) {
    return NextResponse.json({ error: "Provide both startsAt and endsAt to reschedule." }, { status: 400 });
  }

  if (startsAt && endsAt) {
    const result = await rescheduleBooking({
      bookingId: id,
      businessId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      source: "dashboard",
      actorUserId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (status === undefined && staffNotes === undefined) {
      const [current] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
        .limit(1);
      return NextResponse.json(current);
    }
  }

  if (status && status !== existing.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status].includes(status);
    if (!allowed) {
      return NextResponse.json(
        { error: `Cannot change a ${existing.status.replace("_", " ")} booking to ${status.replace("_", " ")}.` },
        { status: 400 }
      );
    }

    if (existing.status === "pending" && status === "confirmed") {
      const [unpaidPayment] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(and(eq(payments.bookingId, id), eq(payments.status, "pending")))
        .limit(1);

      if (unpaidPayment) {
        return NextResponse.json(
          { error: "This booking has an unpaid PayHere payment. Confirm only after payment succeeds or cancel the booking." },
          { status: 400 },
        );
      }
    }
  }

  const [updated] = await db
    .update(bookings)
    .set({
      ...(status !== undefined && { status: status as BookingStatus }),
      ...(staffNotes !== undefined && { staffNotes }),
    })
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (status === "cancelled" && existing.status !== "cancelled") {
    void releaseDealSlotForBooking(updated.id, existing.status).catch((error) => {
      console.error("Deal slot release failed:", error);
    });
  }

  if (status && status !== existing.status) {
    void logActivity({
      action: "status_changed",
      actorUserId: user.id,
      businessId,
      entity: "booking",
      entityId: updated.id,
      meta: { from: existing.status, to: updated.status },
    }).catch((error) => {
      console.error("Activity log write failed:", error);
    });
  }

  // Fire webhook when status changes
  const statusToEvent: Record<string, string> = {
    confirmed: "booking.confirmed",
    cancelled: "booking.cancelled",
    completed: "booking.completed",
    no_show: "booking.no_show",
  };
  if (status && statusToEvent[status]) {
    void dispatchWebhooks(businessId, statusToEvent[status] as Parameters<typeof dispatchWebhooks>[1], {
      bookingId: updated.id,
      status: updated.status,
      clientName: updated.clientName,
      startsAt: updated.startsAt,
    });

    void processBookingAutomationTrigger(businessId, updated.id, statusToEvent[status]).catch((error) => {
      console.error("Automation trigger failed:", error);
    });
  }

  return NextResponse.json(updated);
}
