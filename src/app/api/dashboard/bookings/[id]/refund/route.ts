import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "@/lib/validation";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { requireApiBusiness } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import { planRefund, requestedRefundAmountLkr } from "@/lib/payments/refund";

const bodySchema = z.object({
  amountLkr: z.preprocess(
    (value) => requestedRefundAmountLkr(value),
    z.number().int().positive().optional(),
  ),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiBusiness({ req });
  if (!authResult.ok) return authResult.response;
  const { businessId, user } = authResult.context;
  const { id } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the refund amount and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const [booking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

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

  if (!payment) {
    return NextResponse.json({ error: "This booking has no payment to refund." }, { status: 400 });
  }

  const planned = planRefund({
    status: payment.status,
    amountLkr: payment.amountLkr,
    refundedAmountLkr: payment.refundedAmountLkr,
    requestedAmountLkr: parsed.data.amountLkr,
  });

  if (!planned.ok) {
    return NextResponse.json({ error: planned.error }, { status: 400 });
  }

  const [updated] = await db
    .update(payments)
    .set({
      refundedAmountLkr: planned.nextRefundedTotal,
      refundedAt: new Date(),
      refundReason: parsed.data.reason ?? null,
      status: planned.nextStatus,
    })
    .where(
      and(
        eq(payments.id, payment.id),
        eq(payments.refundedAmountLkr, payment.refundedAmountLkr),
      ),
    )
    .returning({
      id: payments.id,
      amountLkr: payments.amountLkr,
      refundedAmountLkr: payments.refundedAmountLkr,
      status: payments.status,
      provider: payments.provider,
      payhereOrderId: payments.payhereOrderId,
      providerOrderId: payments.providerOrderId,
    });

  if (!updated) {
    return NextResponse.json(
      { error: "This payment was updated. Refresh and try again." },
      { status: 409 },
    );
  }

  void logActivity({
    action: "payment_refunded",
    actorUserId: user.id,
    businessId,
    entity: "payment",
    entityId: updated.id,
    meta: { bookingId: id, amountLkr: planned.amountLkr, status: updated.status },
  }).catch((error) => {
    console.error("Activity log write failed:", error);
  });

  return NextResponse.json({
    payment: {
      id: updated.id,
      amountLkr: updated.amountLkr,
      refundedAmountLkr: updated.refundedAmountLkr,
      status: updated.status,
      provider: updated.provider,
      orderId: updated.payhereOrderId ?? updated.providerOrderId,
    },
  });
}
