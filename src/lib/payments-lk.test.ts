import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  PAYMENTS_LK_SIGNATURE_HEADER,
  paymentsLkAmountCents,
  paymentsLkAmountMatches,
  parsePaymentsLkWebhookEvent,
  verifyPaymentsLkWebhookSignature,
} from "./payments-lk";

function signHeader(timestamp: number, body: string, secret: string): string {
  const hmac = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

describe("payments-lk", () => {
  const webhookSecret = "whsec_test_secret";
  const body = JSON.stringify({
    id: "evt_1",
    object: "event",
    type: "payment.succeeded",
    mode: "test",
    created: "2026-09-15T00:00:00Z",
    data: { reference: "order-8891", amountCents: 145000 },
  });

  it("converts LKR to whole cents", () => {
    expect(paymentsLkAmountCents(1500)).toBe(150000);
    expect(paymentsLkAmountCents(1500.5)).toBe(150050);
  });

  it("matches stored LKR integers to the cents on an event", () => {
    expect(paymentsLkAmountMatches(1450, 145000)).toBe(true);
    expect(paymentsLkAmountMatches(1450, 145001)).toBe(false);
    expect(paymentsLkAmountMatches(1450, undefined)).toBe(false);
  });

  it("verifies a correctly signed webhook", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signHeader(now, body, webhookSecret);
    expect(verifyPaymentsLkWebhookSignature(body, header, webhookSecret, { now })).toBe(true);
  });

  it("rejects a tampered body", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signHeader(now, body, webhookSecret);
    const tampered = body.replace("145000", "1");
    expect(verifyPaymentsLkWebhookSignature(tampered, header, webhookSecret, { now })).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signHeader(now, body, webhookSecret);
    expect(verifyPaymentsLkWebhookSignature(body, header, "whsec_other", { now })).toBe(false);
  });

  it("rejects a timestamp outside the tolerance window (replay protection)", () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const header = signHeader(staleTimestamp, body, webhookSecret);
    expect(verifyPaymentsLkWebhookSignature(body, header, webhookSecret)).toBe(false);
  });

  it("accepts any matching v1 candidate when multiple are present (secret rotation)", () => {
    const now = Math.floor(Date.now() / 1000);
    const oldSig = signHeader(now, body, "whsec_old").split(",")[1];
    const newSig = signHeader(now, body, webhookSecret).split(",")[1];
    const header = `t=${now},${oldSig},${newSig}`;
    expect(verifyPaymentsLkWebhookSignature(body, header, webhookSecret, { now })).toBe(true);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyPaymentsLkWebhookSignature(body, null, webhookSecret)).toBe(false);
    expect(verifyPaymentsLkWebhookSignature(body, "not-a-signature", webhookSecret)).toBe(false);
  });

  it("uses the documented header name", () => {
    expect(PAYMENTS_LK_SIGNATURE_HEADER).toBe("payments-signature");
  });

  it("parses a well-formed event", () => {
    const event = parsePaymentsLkWebhookEvent(body);
    expect(event?.type).toBe("payment.succeeded");
    expect(event?.data).toEqual({ reference: "order-8891", amountCents: 145000 });
  });

  it("returns null for a body that is not a Payments.lk event", () => {
    expect(parsePaymentsLkWebhookEvent("not json")).toBeNull();
    expect(parsePaymentsLkWebhookEvent(JSON.stringify({ foo: "bar" }))).toBeNull();
  });
});
