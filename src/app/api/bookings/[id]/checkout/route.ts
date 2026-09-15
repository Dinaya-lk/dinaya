import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, businesses, payments, services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/secrets";
import { withRateLimit } from "@/lib/rate-limit";
import { hasPublicColumn } from "@/lib/dashboard/db-compat";
import { parseRequiredBusinessSlug } from "@/lib/booking/public-booking-access";
import { createPayhereCheckout } from "@/lib/payments/providers/payhere";
import { createPaypalCheckout, getPaypalOrder } from "@/lib/payments/providers/paypal";
import { createPaymentsLkCheckoutForBooking } from "@/lib/payments/providers/payments-lk";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const limited = await withRateLimit(req, {
    scope: "bookings",
    limit: 30,
    windowSeconds: 60,
  });
  if (!limited.ok) return limited.response;

  const { id: bookingId } = await context.params;
  const slug = parseRequiredBusinessSlug(req.nextUrl.searchParams.get("slug"));
  if (!slug) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  const includePaypal = await hasPublicColumn("businesses", "paypal_enabled");
  const includePaymentsLk = await hasPublicColumn("businesses", "payments_lk_enabled");
  const includePaymentProvider = await hasPublicColumn("payments", "provider");

  const [row] = await db
    .select({
      bookingId: bookings.id,
      bookingStatus: bookings.status,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      clientEmail: bookings.clientEmail,
      businessSlug: businesses.slug,
      businessName: businesses.name,
      payhereEnabled: businesses.payhereEnabled,
      payhereMerchantId: businesses.payhereMerchantId,
      payhereMerchantSecret: businesses.payhereMerchantSecret,
      ...(includePaypal
        ? {
            paypalEnabled: businesses.paypalEnabled,
            paypalClientId: businesses.paypalClientId,
            paypalClientSecret: businesses.paypalClientSecret,
          }
        : {}),
      ...(includePaymentsLk
        ? {
            paymentsLkEnabled: businesses.paymentsLkEnabled,
            paymentsLkSecretKey: businesses.paymentsLkSecretKey,
          }
        : {}),
      serviceName: services.name,
      depositPercent: services.depositPercent,
      paymentId: payments.id,
      paymentStatus: payments.status,
      ...(includePaymentProvider
        ? {
            paymentProvider: payments.provider,
            providerOrderId: payments.providerOrderId,
          }
        : {}),
      payhereOrderId: payments.payhereOrderId,
      amountLkr: payments.amountLkr,
    })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row || row.businessSlug !== slug) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const paymentProvider = includePaymentProvider
    ? ((row as { paymentProvider?: string | null }).paymentProvider ?? "payhere")
    : "payhere";
  const providerOrderId = includePaymentProvider
    ? (row as { providerOrderId?: string | null }).providerOrderId ?? row.payhereOrderId
    : row.payhereOrderId;
  const paypalEnabled = includePaypal
    ? Boolean((row as { paypalEnabled?: boolean }).paypalEnabled)
    : false;
  const paypalClientId = includePaypal
    ? ((row as { paypalClientId?: string | null }).paypalClientId ?? null)
    : null;
  const paypalClientSecret = includePaypal
    ? ((row as { paypalClientSecret?: string | null }).paypalClientSecret ?? null)
    : null;
  const paymentsLkEnabled = includePaymentsLk
    ? Boolean((row as { paymentsLkEnabled?: boolean }).paymentsLkEnabled)
    : false;
  const paymentsLkSecretKey = includePaymentsLk
    ? ((row as { paymentsLkSecretKey?: string | null }).paymentsLkSecretKey ?? null)
    : null;

  if (row.bookingStatus !== "pending" || row.paymentStatus !== "pending" || !row.paymentId) {
    return NextResponse.json({ error: "Payment not required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const checkoutContext = {
    bookingId: row.bookingId,
    businessId: "",
    businessName: row.businessName,
    businessSlug: row.businessSlug,
    serviceName: row.serviceName,
    depositPercent: row.depositPercent,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    amountLkr: row.amountLkr ?? 0,
    appUrl,
  };

  if (paymentProvider === "paypal") {
    const clientSecret = decryptSecret(paypalClientSecret);
    if (!paypalEnabled || !paypalClientId || !clientSecret) {
      return NextResponse.json({ error: "PayPal checkout unavailable" }, { status: 400 });
    }

    if (providerOrderId) {
      const existing = await getPaypalOrder({
        clientId: paypalClientId,
        clientSecret,
        orderId: providerOrderId,
      });

      if (existing.approvalUrl && (existing.status === "CREATED" || existing.status === "APPROVED")) {
        return NextResponse.json({
          provider: "paypal",
          approvalUrl: existing.approvalUrl,
        });
      }
    }

    const paypal = await createPaypalCheckout({
      ...checkoutContext,
      paymentId: row.paymentId,
      clientId: paypalClientId,
      clientSecret,
    });

    return NextResponse.json({
      provider: "paypal",
      approvalUrl: paypal.approvalUrl,
    });
  }

  if (paymentProvider === "payments_lk") {
    const secretKey = decryptSecret(paymentsLkSecretKey);
    if (!paymentsLkEnabled || !secretKey) {
      return NextResponse.json({ error: "Payments.lk checkout unavailable" }, { status: 400 });
    }

    const checkout = await createPaymentsLkCheckoutForBooking({
      ...checkoutContext,
      secretKey,
      orderId: providerOrderId ?? row.bookingId,
    });

    return NextResponse.json({
      provider: "payments_lk",
      checkoutUrl: checkout.checkoutUrl,
    });
  }

  const merchantSecret = decryptSecret(row.payhereMerchantSecret);
  if (!row.payhereEnabled || !row.payhereMerchantId || !row.payhereOrderId || !row.amountLkr || !merchantSecret) {
    return NextResponse.json({ error: "PayHere checkout unavailable" }, { status: 400 });
  }

  const checkout = createPayhereCheckout({
    ...checkoutContext,
    merchantId: row.payhereMerchantId,
    merchantSecret,
    orderId: row.payhereOrderId,
  });

  return NextResponse.json({
    provider: "payhere",
    payhereFormData: checkout.payhereFormData,
    payhereUrl: checkout.payhereUrl,
  });
}
