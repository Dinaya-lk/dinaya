import { createHmac, timingSafeEqual } from "crypto";

/**
 * Low-level Payments.lk REST client + webhook verification.
 * Implemented directly against their documented API (api.payments.lk) rather
 * than depending on their unpublished @payments-lk/node tarball, but the
 * webhook signature scheme below is copied field-for-field from that SDK's
 * source (t=<unix>,v1=<hex hmac-sha256 of "t.body">) since it isn't otherwise
 * documented and getting it wrong would either reject every webhook or,
 * worse, accept a forged one.
 */

const API_BASE = "https://api.payments.lk";
export const PAYMENTS_LK_SIGNATURE_HEADER = "payments-signature";
export const PAYMENTS_LK_WEBHOOK_TOLERANCE_SECONDS = 300;

export type PaymentsLkCheckout = {
  object: "checkout";
  id: string;
  mode: "test" | "live";
  status: "open" | "processing" | "completed" | "expired" | "canceled";
  /** Send the customer here. */
  url: string;
  expiresAt: string;
};

export type PaymentsLkWebhookEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "checkout.expired"
  | "card.saved"
  | "refund.succeeded"
  | "refund.failed";

export type PaymentsLkWebhookEvent<T = Record<string, unknown>> = {
  id: string;
  object: "event";
  type: PaymentsLkWebhookEventType;
  mode: "test" | "live";
  created: string;
  data: T;
};

export type PaymentsLkPaymentEventData = {
  reference?: string | null;
  amountCents?: number;
  currency?: string;
  id?: string;
};

function isSandboxKey(secretKey: string): boolean {
  return secretKey.startsWith("sk_test_");
}

export function paymentsLkAmountCents(amountLkr: number): number {
  return Math.round(amountLkr * 100);
}

export function paymentsLkAmountMatches(amountLkr: number, amountCents: number | undefined): boolean {
  return amountCents === paymentsLkAmountCents(amountLkr);
}

export async function createPaymentsLkCheckout(params: {
  secretKey: string;
  amountLkr: number;
  description: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<PaymentsLkCheckout> {
  const res = await fetch(`${API_BASE}/v1/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": params.reference,
    },
    body: JSON.stringify({
      amountCents: paymentsLkAmountCents(params.amountLkr),
      description: params.description,
      reference: params.reference,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      ...(params.customerName || params.customerEmail
        ? {
            customer: {
              name: params.customerName || "",
              email: params.customerEmail || "",
              ...(params.customerPhone ? { phone: params.customerPhone } : {}),
            },
          }
        : {}),
    }),
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Payments.lk answered with HTTP ${res.status}.`;
    throw new Error(message);
  }

  const checkout = body as Partial<PaymentsLkCheckout> | null;
  if (!checkout?.id || !checkout.url) {
    throw new Error("Payments.lk checkout response was missing an id or url.");
  }

  return checkout as PaymentsLkCheckout;
}

/**
 * Verifies a `payments-signature: t=<unix>,v1=<hex>[,v1=<hex>...]` header
 * against `${timestamp}.${rawBody}` HMAC-SHA256'd with the endpoint's
 * whsec_ secret. Multiple v1 candidates (secret rotation) are all checked;
 * any match wins. Comparison is constant-time.
 */
export function verifyPaymentsLkWebhookSignature(
  rawBody: string,
  header: string | null | undefined,
  webhookSecret: string,
  options: { toleranceSeconds?: number; now?: number } = {},
): boolean {
  if (!header || !webhookSecret) return false;
  if (header.length > 1000) return false;

  let timestamp: number | undefined;
  const candidates: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t" && value && /^[0-9]{1,12}$/.test(value)) {
      timestamp = Number(value);
    }
    if (key === "v1" && value && /^[0-9a-f]{64}$/.test(value)) {
      candidates.push(value);
    }
  }

  if (timestamp === undefined || candidates.length === 0) return false;

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSeconds ?? PAYMENTS_LK_WEBHOOK_TOLERANCE_SECONDS;
  if (Math.abs(now - timestamp) > tolerance) return false;

  const expected = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`, "utf8").digest();

  return candidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "hex");
    return candidateBuffer.length === expected.length && timingSafeEqual(expected, candidateBuffer);
  });
}

/** Parses (without verifying) a webhook body into a typed event, or null if it isn't one. */
export function parsePaymentsLkWebhookEvent<T = Record<string, unknown>>(
  rawBody: string,
): PaymentsLkWebhookEvent<T> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as Record<string, unknown>)["object"] !== "event" ||
    typeof (parsed as Record<string, unknown>)["id"] !== "string" ||
    typeof (parsed as Record<string, unknown>)["type"] !== "string"
  ) {
    return null;
  }

  return parsed as PaymentsLkWebhookEvent<T>;
}

export function isPaymentsLkSandboxKey(secretKey: string | null | undefined): boolean {
  return Boolean(secretKey && isSandboxKey(secretKey));
}
