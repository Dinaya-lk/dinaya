import { and, asc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, services } from "@/db/schema";
import { logActivity } from "@/lib/activity-log";
import { releaseDealSlotForBooking } from "@/lib/deals/claim";
import { dispatchWebhooks } from "@/lib/webhooks";

/** Unpaid PayHere checkouts block slots via the overlap constraint — release after this TTL. */
export const PENDING_PAYHERE_BOOKING_TTL_MINUTES = 30;

export async function expireAbandonedPayhereBookings(): Promise<{
  expired: number;
  checked: number;
}> {
  const cutoff = new Date(Date.now() - PENDING_PAYHERE_BOOKING_TTL_MINUTES * 60 * 1000);

  const stale = await db
    .select({
      bookingId: bookings.id,
      businessId: bookings.businessId,
      status: bookings.status,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      serviceName: services.name,
      startsAt: bookings.startsAt,
    })
    .from(bookings)
    .innerJoin(payments, eq(payments.bookingId, bookings.id))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(
      and(
        eq(bookings.status, "pending"),
        eq(payments.status, "pending"),
        lt(payments.createdAt, cutoff),
      ),
    )
    .orderBy(asc(payments.createdAt))
    .limit(200);

  let expired = 0;

  for (const row of stale) {
    const [updated] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: "Payment not completed in time.",
      })
      .where(
        and(
          eq(bookings.id, row.bookingId),
          eq(bookings.status, "pending"),
        ),
      )
      .returning({ id: bookings.id });

    if (!updated) continue;

    await db
      .update(payments)
      .set({ status: "failed" })
      .where(and(eq(payments.bookingId, row.bookingId), eq(payments.status, "pending")));

    void releaseDealSlotForBooking(row.bookingId, "pending").catch((error) => {
      console.error("Deal slot release failed:", error);
    });

    void logActivity({
      action: "cancelled",
      businessId: row.businessId,
      entity: "booking",
      entityId: row.bookingId,
      meta: { source: "pending_payment_expiry" },
    }).catch((error) => {
      console.error("Activity log write failed:", error);
    });

    void dispatchWebhooks(row.businessId, "booking.cancelled", {
      bookingId: row.bookingId,
      status: "cancelled",
      clientName: row.clientName,
      clientPhone: row.clientPhone,
      serviceName: row.serviceName ?? "Deleted service",
      startsAt: row.startsAt.toISOString(),
      reason: "payment_expired",
    });

    expired += 1;
  }

  return { expired, checked: stale.length };
}
