import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateOrderId } from "@/lib/utils";
import { decryptSecret } from "@/lib/secrets";
import { hasPublicColumn } from "@/lib/dashboard/db-compat";
import { createPayhereCheckout } from "@/lib/payments/providers/payhere";
import { createPaypalCheckout } from "@/lib/payments/providers/paypal";
import { createPaymentsLkCheckoutForBooking } from "@/lib/payments/providers/payments-lk";
import {
  getAvailablePaymentMethods,
  resolveOnlinePaymentMethod,
} from "@/lib/payments/resolve";
import type {
  BookingCheckoutResult,
  CheckoutContext,
  PaymentBusinessConfig,
} from "@/lib/payments/types";

export async function startBookingCheckout(input: {
  bookingId: string;
  businessId: string;
  business: PaymentBusinessConfig & { slug: string; name: string };
  serviceName: string;
  depositPercent: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  amountLkr: number;
  requiresPayment: boolean;
  appUrl: string;
  paymentMethod?: "payhere" | "paypal" | "payments_lk" | null;
}): Promise<BookingCheckoutResult> {
  const hasPayhereSecret = Boolean(decryptSecret(input.business.payhereMerchantSecret));
  const hasPaypalSecret = Boolean(decryptSecret(input.business.paypalClientSecret));
  const hasPaymentsLkSecret = Boolean(decryptSecret(input.business.paymentsLkSecretKey));

  const methods = getAvailablePaymentMethods(
    input.business,
    input.requiresPayment,
    input.amountLkr,
    hasPayhereSecret,
    hasPaypalSecret,
    hasPaymentsLkSecret,
  );

  if (!input.requiresPayment || input.amountLkr <= 0) {
    return { kind: "confirmed", bookingId: input.bookingId, status: "confirmed" };
  }

  const onlineMethod = resolveOnlinePaymentMethod({
    methods,
    requested: input.paymentMethod,
    clientPhone: input.clientPhone,
  });

  if (!onlineMethod) {
    if (methods.includes("manual")) {
      return {
        kind: "manual",
        bookingId: input.bookingId,
        manualPayment: true,
        status: "pending",
      };
    }

    throw new Error("No payment method is configured for this business.");
  }

  const checkoutContext: CheckoutContext = {
    bookingId: input.bookingId,
    businessId: input.businessId,
    businessName: input.business.name,
    businessSlug: input.business.slug,
    serviceName: input.serviceName,
    depositPercent: input.depositPercent,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    amountLkr: input.amountLkr,
    appUrl: input.appUrl,
  };

  if (onlineMethod === "payhere") {
    const merchantId = input.business.payhereMerchantId;
    const merchantSecret = decryptSecret(input.business.payhereMerchantSecret);
    if (!merchantId || !merchantSecret) {
      throw new Error("PayHere credentials are incomplete.");
    }

    const orderId = generateOrderId();
    const hasProviderColumns = await hasPublicColumn("payments", "provider");
    await db.insert(payments).values(
      hasProviderColumns
        ? {
            bookingId: input.bookingId,
            amountLkr: input.amountLkr,
            provider: "payhere",
            currency: "LKR",
            providerOrderId: orderId,
            payhereOrderId: orderId,
            status: "pending",
          }
        : {
            bookingId: input.bookingId,
            amountLkr: input.amountLkr,
            payhereOrderId: orderId,
            status: "pending",
          },
    );

    const checkout = createPayhereCheckout({
      ...checkoutContext,
      merchantId,
      merchantSecret,
      orderId,
    });

    return {
      kind: "payhere",
      bookingId: input.bookingId,
      payhereFormData: checkout.payhereFormData,
      payhereUrl: checkout.payhereUrl,
    };
  }

  const hasProviderColumns = await hasPublicColumn("payments", "provider");
  if (!hasProviderColumns) {
    throw new Error("This payment method requires a database migration. PayHere is available.");
  }

  if (onlineMethod === "payments_lk") {
    const secretKey = decryptSecret(input.business.paymentsLkSecretKey);
    if (!secretKey) {
      throw new Error("Payments.lk credentials are incomplete.");
    }

    const orderId = generateOrderId();
    const [payment] = await db
      .insert(payments)
      .values({
        bookingId: input.bookingId,
        amountLkr: input.amountLkr,
        provider: "payments_lk",
        currency: "LKR",
        providerOrderId: orderId,
        status: "pending",
      })
      .returning({ id: payments.id });

    if (!payment) {
      throw new Error("Could not create payment record.");
    }

    const checkout = await createPaymentsLkCheckoutForBooking({
      ...checkoutContext,
      secretKey,
      orderId,
    });

    await db
      .update(payments)
      .set({ providerPayload: { checkoutId: checkout.checkoutId } })
      .where(eq(payments.id, payment.id));

    return {
      kind: "payments_lk",
      bookingId: input.bookingId,
      checkoutUrl: checkout.checkoutUrl,
    };
  }

  const clientId = input.business.paypalClientId;
  const clientSecret = decryptSecret(input.business.paypalClientSecret);
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are incomplete.");
  }

  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: input.bookingId,
      amountLkr: input.amountLkr,
      provider: "paypal",
      currency: "USD",
      status: "pending",
    })
    .returning({ id: payments.id });

  if (!payment) {
    throw new Error("Could not create payment record.");
  }

  const paypal = await createPaypalCheckout({
    ...checkoutContext,
    paymentId: payment.id,
    clientId,
    clientSecret,
  });

  await db
    .update(payments)
    .set({
      providerOrderId: paypal.orderId,
      providerPayload: { amountUsd: paypal.amountUsd },
    })
    .where(eq(payments.id, payment.id));

  return {
    kind: "paypal",
    bookingId: input.bookingId,
    approvalUrl: paypal.approvalUrl,
  };
}
