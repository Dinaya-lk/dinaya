import { createPaymentsLkCheckout } from "@/lib/payments-lk";
import type { CheckoutContext } from "@/lib/payments/types";

export async function createPaymentsLkCheckoutForBooking(input: CheckoutContext & {
  secretKey: string;
  orderId: string;
}): Promise<{ checkoutId: string; checkoutUrl: string }> {
  const depositLabel = input.depositPercent > 0 ? `${input.depositPercent}% deposit for ` : "";

  const checkout = await createPaymentsLkCheckout({
    secretKey: input.secretKey,
    amountLkr: input.amountLkr,
    description: `${depositLabel}${input.serviceName} - ${input.businessName}`,
    reference: input.orderId,
    successUrl: `${input.appUrl}/book/${input.businessSlug}/confirmed?bookingId=${input.bookingId}`,
    cancelUrl: `${input.appUrl}/book/${input.businessSlug}`,
    customerName: input.clientName,
    customerEmail: input.clientEmail || undefined,
    customerPhone: input.clientPhone,
  });

  return { checkoutId: checkout.id, checkoutUrl: checkout.url };
}
