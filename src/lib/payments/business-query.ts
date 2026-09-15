import { db } from "@/db";
import { businesses } from "@/db/schema";
import { hasPublicColumn } from "@/lib/dashboard/db-compat";
import { eq } from "drizzle-orm";

export type BusinessPaymentSettings = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  bankTransferInstructions: string | null;
  lankaqrImageUrl: string | null;
  payhereEnabled: boolean;
  payhereMerchantId: string | null;
  payhereMerchantSecret: string | null;
  slug: string;
  plan: string;
  language: string | null;
  timezone: string | null;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalClientSecret: string | null;
  paymentsLkEnabled: boolean;
  paymentsLkSecretKey: string | null;
  paymentsLkWebhookSecret: string | null;
};

const basePaymentColumns = {
  id: businesses.id,
  email: businesses.email,
  phone: businesses.phone,
  name: businesses.name,
  bankTransferInstructions: businesses.bankTransferInstructions,
  lankaqrImageUrl: businesses.lankaqrImageUrl,
  payhereEnabled: businesses.payhereEnabled,
  payhereMerchantId: businesses.payhereMerchantId,
  payhereMerchantSecret: businesses.payhereMerchantSecret,
  slug: businesses.slug,
  plan: businesses.plan,
  language: businesses.language,
  timezone: businesses.timezone,
} as const;

export async function getBusinessPaymentSettings(
  businessId: string,
): Promise<BusinessPaymentSettings | null> {
  const includePaypal = await hasPublicColumn("businesses", "paypal_enabled");
  const includePaymentsLk = await hasPublicColumn("businesses", "payments_lk_enabled");

  const [row] = await db
    .select({
      ...basePaymentColumns,
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
            paymentsLkWebhookSecret: businesses.paymentsLkWebhookSecret,
          }
        : {}),
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    paypalEnabled: includePaypal ? Boolean((row as { paypalEnabled?: boolean }).paypalEnabled) : false,
    paypalClientId: includePaypal ? ((row as { paypalClientId?: string | null }).paypalClientId ?? null) : null,
    paypalClientSecret: includePaypal
      ? ((row as { paypalClientSecret?: string | null }).paypalClientSecret ?? null)
      : null,
    paymentsLkEnabled: includePaymentsLk
      ? Boolean((row as { paymentsLkEnabled?: boolean }).paymentsLkEnabled)
      : false,
    paymentsLkSecretKey: includePaymentsLk
      ? ((row as { paymentsLkSecretKey?: string | null }).paymentsLkSecretKey ?? null)
      : null,
    paymentsLkWebhookSecret: includePaymentsLk
      ? ((row as { paymentsLkWebhookSecret?: string | null }).paymentsLkWebhookSecret ?? null)
      : null,
  };
}
