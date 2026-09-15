export const PAYMENT_PROVIDERS = ["payhere", "paypal", "payments_lk", "manual"] as const;

export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export type PaymentMethodChoice = "payhere" | "paypal" | "payments_lk" | "manual";

export type BookingCheckoutResult =
  | {
      kind: "confirmed";
      bookingId: string;
      manualPayment?: boolean;
      status: string;
    }
  | {
      kind: "payhere";
      bookingId: string;
      payhereFormData: Record<string, string>;
      payhereUrl: string;
    }
  | {
      kind: "paypal";
      bookingId: string;
      approvalUrl: string;
    }
  | {
      kind: "payments_lk";
      bookingId: string;
      checkoutUrl: string;
    }
  | {
      kind: "manual";
      bookingId: string;
      manualPayment: true;
      status: "pending";
    };

export type PaymentBusinessConfig = {
  payhereEnabled: boolean;
  payhereMerchantId: string | null;
  payhereMerchantSecret: string | null;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalClientSecret: string | null;
  paymentsLkEnabled: boolean;
  paymentsLkSecretKey: string | null;
  paymentsLkWebhookSecret: string | null;
  bankTransferInstructions: string | null;
  lankaqrImageUrl: string | null;
};

export type CheckoutContext = {
  bookingId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  serviceName: string;
  depositPercent: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  amountLkr: number;
  appUrl: string;
};
