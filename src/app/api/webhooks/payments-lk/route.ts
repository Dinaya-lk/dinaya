import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, bookings, businesses, services, staff } from "@/db/schema";
import { eq, and, inArray, lt, gt, ne } from "drizzle-orm";
import {
  PAYMENTS_LK_SIGNATURE_HEADER,
  paymentsLkAmountMatches,
  parsePaymentsLkWebhookEvent,
  verifyPaymentsLkWebhookSignature,
  type PaymentsLkPaymentEventData,
} from "@/lib/payments-lk";
import { sendBookingNotificationToBusiness } from "@/lib/resend";
import { sendBookingConfirmationMessage, sendBookingNotificationToBusinessMessage } from "@/lib/messaging/booking-messages";
import { buildClientBookingUrl } from "@/lib/client-tokens";
import type { Plan } from "@/lib/plan";
import type { BookingLanguage } from "@/lib/i18n";
import { logActivity } from "@/lib/activity-log";
import { decryptSecret } from "@/lib/secrets";
import { processBookingAutomationTrigger } from "@/lib/automations/engine";
import { releaseDealSlotForBooking, claimDealSlot } from "@/lib/deals/claim";
import { sendPaymentReceiptEmail } from "@/lib/receipts";
import { logRejectedSettled, runAfterResponse } from "@/lib/after-response";
import { isDailyCapacityReached } from "@/lib/booking-availability";

const WEBHOOK_REJECTED = NextResponse.json({ error: "Invalid webhook" }, { status: 400 });

function isOverlapConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; cause?: { code?: string } };
  return maybe.code === "23P01" || maybe.cause?.code === "23P01";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const event = parsePaymentsLkWebhookEvent<PaymentsLkPaymentEventData>(rawBody);
  const reference = event?.data?.reference;

  if (!event || !reference) {
    return WEBHOOK_REJECTED;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.providerOrderId, reference), eq(payments.provider, "payments_lk")))
    .limit(1);

  if (!payment) {
    return WEBHOOK_REJECTED;
  }

  const [booking] = await db
    .select({
      id: bookings.id,
      businessId: bookings.businessId,
      status: bookings.status,
      clientEmail: bookings.clientEmail,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      serviceId: bookings.serviceId,
      staffId: bookings.staffId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      dealId: bookings.dealId,
      cancellationReason: bookings.cancellationReason,
    })
    .from(bookings)
    .where(eq(bookings.id, payment.bookingId))
    .limit(1);

  if (!booking) {
    return WEBHOOK_REJECTED;
  }

  const [business] = await db
    .select({
      email: businesses.email,
      phone: businesses.phone,
      name: businesses.name,
      paymentsLkWebhookSecret: businesses.paymentsLkWebhookSecret,
      slug: businesses.slug,
      plan: businesses.plan,
      language: businesses.language,
      timezone: businesses.timezone,
    })
    .from(businesses)
    .where(eq(businesses.id, booking.businessId))
    .limit(1);

  if (!business) {
    return WEBHOOK_REJECTED;
  }

  const webhookSecret = decryptSecret(business.paymentsLkWebhookSecret);
  if (!webhookSecret) {
    return WEBHOOK_REJECTED;
  }

  const signatureHeader = req.headers.get(PAYMENTS_LK_SIGNATURE_HEADER);
  const valid = verifyPaymentsLkWebhookSignature(rawBody, signatureHeader, webhookSecret);
  if (!valid) {
    return WEBHOOK_REJECTED;
  }

  if (event.type === "payment.succeeded") {
    if (!paymentsLkAmountMatches(payment.amountLkr, event.data.amountCents)) {
      return WEBHOOK_REJECTED;
    }

    const [claimedPayment] = await db
      .update(payments)
      .set({
        status: "success",
        provider: "payments_lk",
        currency: "LKR",
        providerOrderId: reference,
        providerPayload: event.data as Record<string, unknown>,
      })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning({ id: payments.id });

    if (!claimedPayment) {
      const [currentPayment] = await db
        .select({ status: payments.status })
        .from(payments)
        .where(eq(payments.id, payment.id))
        .limit(1);

      if (currentPayment?.status === "success") {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Late payment after expiry cron marked the payment failed and booking cancelled.
      if (currentPayment?.status === "failed") {
        let recovered = false;

        if (
          booking.status === "cancelled" &&
          booking.staffId &&
          booking.serviceId &&
          booking.cancellationReason === "Payment not completed in time."
        ) {
          const slotConflict = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(
              and(
                eq(bookings.staffId, booking.staffId),
                ne(bookings.id, booking.id),
                inArray(bookings.status, ["pending", "confirmed"]),
                lt(bookings.startsAt, booking.endsAt),
                gt(bookings.endsAt, booking.startsAt),
              ),
            )
            .limit(1);

          const [service] = await db
            .select({ dailyCapacity: services.dailyCapacity })
            .from(services)
            .where(eq(services.id, booking.serviceId))
            .limit(1);

          const capacityReached =
            service && booking.staffId
              ? await isDailyCapacityReached({
                  staffId: booking.staffId,
                  serviceId: booking.serviceId,
                  start: booking.startsAt,
                  timezone: business.timezone ?? "Asia/Colombo",
                  dailyCapacity: service.dailyCapacity,
                })
              : false;

          // Mark payment success first — money was received regardless of booking recovery.
          await db
            .update(payments)
            .set({
              status: "success",
              provider: "payments_lk",
              currency: "LKR",
              providerOrderId: reference,
              providerPayload: event.data as Record<string, unknown>,
            })
            .where(eq(payments.id, payment.id));

          if (slotConflict.length === 0 && !capacityReached) {
            try {
              const [reconfirmed] = await db
                .update(bookings)
                .set({ status: "confirmed", cancelledAt: null, cancellationReason: null })
                .where(and(eq(bookings.id, booking.id), eq(bookings.status, "cancelled")))
                .returning({ id: bookings.id });
              recovered = Boolean(reconfirmed);
              if (recovered && booking.dealId) {
                const claimedDeal = await claimDealSlot(booking.dealId);
                if (!claimedDeal) {
                  await db
                    .update(bookings)
                    .set({
                      status: "cancelled",
                      cancelledAt: new Date(),
                      cancellationReason: "Deal sold out during late payment recovery.",
                    })
                    .where(eq(bookings.id, booking.id));
                  recovered = false;
                }
              }
            } catch (error) {
              if (!isOverlapConstraintError(error)) {
                throw error;
              }
            }
          }
        }

        if (recovered) {
          await logActivity({
            action: "payment_success",
            businessId: booking.businessId,
            entity: "booking",
            entityId: booking.id,
            meta: { reference, amountCents: event.data.amountCents, recovered: true },
          });
          await logActivity({
            action: "payment_late_recovery",
            businessId: booking.businessId,
            entity: "booking",
            entityId: booking.id,
            meta: { reference, amountCents: event.data.amountCents },
          });
          void processBookingAutomationTrigger(booking.businessId, booking.id, "booking.confirmed").catch(
            (error) => {
              console.error("Automation trigger failed:", error);
            },
          );

          return NextResponse.json({ received: true, recovered: true });
        }

        await logActivity({
          action: "payment_orphaned",
          businessId: booking.businessId,
          entity: "booking",
          entityId: booking.id,
          meta: {
            reference,
            amountCents: event.data.amountCents,
            bookingStatus: booking.status,
            needsManualRefund: true,
            clientName: booking.clientName,
            clientPhone: booking.clientPhone,
          },
        });

        // Flag for manual refund so support tooling surfaces this without
        // relying on anyone reading the activity feed.
        await db
          .update(payments)
          .set({
            refundReason: `Paid ${((event.data.amountCents ?? 0) / 100).toFixed(2)} LKR but the slot was unavailable (reference ${reference}) — manual refund needed.`,
          })
          .where(eq(payments.id, payment.id));

        return NextResponse.json({ received: true, orphaned: true });
      }

      return WEBHOOK_REJECTED;
    }

    const [confirmedBooking] = await db
      .update(bookings)
      .set({ status: "confirmed" })
      .where(and(eq(bookings.id, booking.id), eq(bookings.status, "pending")))
      .returning({ id: bookings.id });

    if (!confirmedBooking) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    void processBookingAutomationTrigger(booking.businessId, booking.id, "booking.confirmed").catch((error) => {
      console.error("Automation trigger failed:", error);
    });

    await logActivity({
      action: "payment_success",
      businessId: booking.businessId,
      entity: "booking",
      entityId: booking.id,
      meta: { reference, amountCents: event.data.amountCents },
    });

    const [[service], [staffMember]] = await Promise.all([
      booking.serviceId
        ? db
            .select({ name: services.name })
            .from(services)
            .where(eq(services.id, booking.serviceId))
            .limit(1)
        : Promise.resolve([]),
      booking.staffId
        ? db.select().from(staff).where(eq(staff.id, booking.staffId)).limit(1)
        : Promise.resolve([]),
    ]);

    runAfterResponse("Payments.lk booking notifications", async () => {
      const manageUrl = buildClientBookingUrl({
        bookingId: booking.id,
        clientPhone: booking.clientPhone,
      });
      const results = await Promise.allSettled([
        sendBookingConfirmationMessage({
          businessId: booking.businessId,
          bookingId: booking.id,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          businessName: business.name,
          serviceName: service?.name ?? "Service",
          staffName: staffMember?.name ?? "Staff",
          startsAt: booking.startsAt,
          manageUrl,
          plan: business.plan as Plan,
          language: business.language as BookingLanguage,
        }),
        booking.clientEmail
          ? sendPaymentReceiptEmail({
              clientName: booking.clientName,
              clientEmail: booking.clientEmail,
              businessName: business.name,
              serviceName: service?.name ?? "Service",
              staffName: staffMember?.name ?? "Staff",
              startsAt: booking.startsAt,
              amountLkr: payment.amountLkr,
              orderId: reference,
              paymentId: payment.id,
              manageUrl,
            }).then(async (result) => {
              if (result.status === "sent") {
                await db
                  .update(payments)
                  .set({ receiptSentAt: new Date() })
                  .where(eq(payments.id, payment.id));
              }
            })
          : Promise.resolve(),
        business.email
          ? sendBookingNotificationToBusiness({
              clientName: booking.clientName,
              clientEmail: business.email,
              businessName: business.name,
              businessSlug: business.slug,
              serviceName: service?.name ?? "Service",
              staffName: staffMember?.name ?? "Staff",
              startsAt: booking.startsAt,
              bookingId: booking.id,
            })
          : Promise.resolve(),
        business.phone
          ? sendBookingNotificationToBusinessMessage({
              businessId: booking.businessId,
              bookingId: booking.id,
              businessPhone: business.phone,
              businessName: business.name,
              clientName: booking.clientName,
              serviceName: service?.name ?? "Service",
              staffName: staffMember?.name ?? "Staff",
              startsAt: booking.startsAt,
              plan: business.plan as Plan,
            })
          : Promise.resolve(),
      ]);
      logRejectedSettled("Payments.lk booking notifications", results);
    });
  } else if (event.type === "payment.failed" || event.type === "checkout.expired") {
    const [failedPayment] = await db
      .update(payments)
      .set({
        status: "failed",
        provider: "payments_lk",
        providerOrderId: reference,
        providerPayload: event.data as Record<string, unknown>,
      })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning({ id: payments.id });

    const [cancelledBooking] = failedPayment
      ? await db
          .update(bookings)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            // Keep this exact string: the late-payment recovery path and the
            // expiry worker match on it to recognize auto-cancels.
            cancellationReason: "Payment not completed in time.",
          })
          .where(and(eq(bookings.id, booking.id), eq(bookings.status, "pending")))
          .returning({ id: bookings.id })
      : [];

    if (failedPayment && cancelledBooking) {
      void releaseDealSlotForBooking(booking.id, "pending").catch((error) => {
        console.error("Deal slot release failed:", error);
      });
      await logActivity({
        action: event.type === "checkout.expired" ? "payment_cancelled" : "payment_failed",
        businessId: booking.businessId,
        entity: "booking",
        entityId: booking.id,
        meta: { reference, amountCents: event.data.amountCents, eventType: event.type },
      });
    }
  } else if (payment.status === "success") {
    // Post-success failure/expiry (e.g. a reversal after capture): money
    // moved, so this must never be silent. Flag for manual review/refund.
    await db
      .update(payments)
      .set({
        refundReason: `Payments.lk reported ${event.type} after a successful payment for reference ${reference} — verify in the Payments.lk dashboard and refund if valid.`,
      })
      .where(eq(payments.id, payment.id));
    await logActivity({
      action: "payment_flagged",
      businessId: booking.businessId,
      entity: "booking",
      entityId: booking.id,
      meta: {
        reference,
        amountCents: event.data.amountCents,
        eventType: event.type,
        needsManualRefund: true,
      },
    });
  }

  return NextResponse.json({ received: true });
}
