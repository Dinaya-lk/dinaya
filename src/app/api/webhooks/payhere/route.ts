import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, bookings, businesses, services, staff } from "@/db/schema";
import { eq, and, inArray, lt, gt, ne } from "drizzle-orm";
import { payhereAmountMatches, verifyPayhereWebhook } from "@/lib/payhere";
import { parsePayhereWebhookFields } from "@/lib/payhere-webhook";
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
import { hasPublicColumn } from "@/lib/dashboard/db-compat";
import { isDailyCapacityReached } from "@/lib/booking-availability";

const WEBHOOK_REJECTED = NextResponse.json({ error: "Invalid webhook" }, { status: 400 });

function isOverlapConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; cause?: { code?: string } };
  return maybe.code === "23P01" || maybe.cause?.code === "23P01";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const fields = parsePayhereWebhookFields(form);

  if (!fields) {
    return WEBHOOK_REJECTED;
  }

  const { merchantId, orderId, payhereAmount, payhereCurrency, statusCode, md5sig } = fields;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.payhereOrderId, orderId))
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
      payhereMerchantId: businesses.payhereMerchantId,
      payhereMerchantSecret: businesses.payhereMerchantSecret,
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

  const merchantSecret = decryptSecret(business.payhereMerchantSecret);
  if (!merchantSecret) {
    return WEBHOOK_REJECTED;
  }

  if (!business.payhereMerchantId || business.payhereMerchantId !== merchantId) {
    return WEBHOOK_REJECTED;
  }

  const valid = verifyPayhereWebhook({
    merchantId,
    orderId,
    payhereAmount,
    payhereCurrency,
    statusCode,
    md5sig,
    merchantSecret,
  });

  if (!valid) {
    return WEBHOOK_REJECTED;
  }

  const allFields: Record<string, string> = {};
  form.forEach((v, k) => { allFields[k] = v as string; });

  if (statusCode === "2") {
    if (
      payhereCurrency !== "LKR" ||
      !payhereAmountMatches(payment.amountLkr, payhereAmount)
    ) {
      return WEBHOOK_REJECTED;
    }

    const includePaymentProvider = await hasPublicColumn("payments", "provider");
    const [claimedPayment] = await db
      .update(payments)
      .set(
        includePaymentProvider
          ? {
              status: "success",
              payherePayload: allFields,
              provider: "payhere",
              currency: "LKR",
              providerOrderId: orderId,
              providerPayload: allFields,
            }
          : {
              status: "success",
              payherePayload: allFields,
            },
      )
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
            .set(
              includePaymentProvider
                ? {
                    status: "success",
                    payherePayload: allFields,
                    provider: "payhere",
                    currency: "LKR",
                    providerOrderId: orderId,
                    providerPayload: allFields,
                  }
                : {
                    status: "success",
                    payherePayload: allFields,
                  },
            )
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
            meta: { orderId, amount: payhereAmount, currency: payhereCurrency, recovered: true },
          });
          await logActivity({
            action: "payment_late_recovery",
            businessId: booking.businessId,
            entity: "booking",
            entityId: booking.id,
            meta: { orderId, amount: payhereAmount },
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
            orderId,
            amount: payhereAmount,
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
            refundReason: `Paid ${payhereAmount} LKR but the slot was unavailable (order ${orderId}) — manual refund needed.`,
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
      meta: { orderId, amount: payhereAmount, currency: payhereCurrency },
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

    runAfterResponse("PayHere booking notifications", async () => {
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
              orderId,
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
      logRejectedSettled("PayHere booking notifications", results);
    });
  } else if (statusCode === "-1" || statusCode === "-2" || statusCode === "-3") {
    const [failedPayment] = await db
      .update(payments)
      .set({ status: "failed", payherePayload: allFields })
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
        action:
          statusCode === "-3"
            ? "payment_chargeback"
            : statusCode === "-2"
              ? "payment_failed"
              : "payment_cancelled",
        businessId: booking.businessId,
        entity: "booking",
        entityId: booking.id,
        meta: {
          orderId,
          amount: payhereAmount,
          currency: payhereCurrency,
          payhereStatusCode: statusCode,
        },
      });
    } else if (payment.status === "success") {
      // Post-success -1/-2/-3 (e.g. a chargeback after capture): money moved,
      // so this must never be silent. Flag for manual review/refund.
      const disputed = statusCode === "-3";
      await db
        .update(payments)
        .set({
          refundReason: disputed
            ? `PayHere chargeback reported for order ${orderId} — verify in the PayHere dashboard and refund if valid.`
            : `PayHere reported status ${statusCode} after a successful payment for order ${orderId} — manual review needed.`,
        })
        .where(eq(payments.id, payment.id));
      await logActivity({
        action: disputed ? "payment_disputed" : "payment_flagged",
        businessId: booking.businessId,
        entity: "booking",
        entityId: booking.id,
        meta: {
          orderId,
          amount: payhereAmount,
          currency: payhereCurrency,
          payhereStatusCode: statusCode,
          needsManualRefund: disputed,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
