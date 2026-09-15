import { describe, expect, it } from "vitest";
import {
  getAvailablePaymentMethods,
  isLikelySriLankanPhone,
  resolveDefaultPaymentMethod,
  resolveOnlinePaymentMethod,
} from "@/lib/payments/resolve";

const business = {
  payhereEnabled: true,
  payhereMerchantId: "mid",
  payhereMerchantSecret: "secret",
  paypalEnabled: true,
  paypalClientId: "cid",
  paypalClientSecret: "secret",
  paymentsLkEnabled: false,
  paymentsLkSecretKey: null,
  paymentsLkWebhookSecret: null,
  bankTransferInstructions: null,
  lankaqrImageUrl: null,
};

describe("payment resolve", () => {
  it("detects Sri Lankan phone numbers", () => {
    expect(isLikelySriLankanPhone("+94771234567")).toBe(true);
    expect(isLikelySriLankanPhone("+14155550123")).toBe(false);
  });

  it("lists payhere and paypal when both are configured", () => {
    const methods = getAvailablePaymentMethods(business, true, 5000, true, true);
    expect(methods).toEqual(["payhere", "paypal"]);
  });

  it("defaults local customers to payhere", () => {
    const methods = getAvailablePaymentMethods(business, true, 5000, true, true);
    expect(resolveDefaultPaymentMethod(methods, "+94771234567")).toBe("payhere");
  });

  it("defaults international customers to paypal", () => {
    const methods = getAvailablePaymentMethods(business, true, 5000, true, true);
    expect(resolveOnlinePaymentMethod({
      methods,
      clientPhone: "+14155550123",
    })).toBe("paypal");
  });

  it("lists payments_lk when configured", () => {
    const withPaymentsLk = { ...business, paymentsLkEnabled: true };
    const methods = getAvailablePaymentMethods(withPaymentsLk, true, 5000, true, true, true);
    expect(methods).toEqual(["payhere", "payments_lk", "paypal"]);
  });

  it("still prefers payhere over payments_lk for local customers by default", () => {
    const withPaymentsLk = { ...business, paymentsLkEnabled: true };
    const methods = getAvailablePaymentMethods(withPaymentsLk, true, 5000, true, true, true);
    expect(resolveDefaultPaymentMethod(methods, "+94771234567")).toBe("payhere");
  });

  it("falls back to payments_lk for local customers when payhere isn't configured", () => {
    const onlyPaymentsLk = {
      ...business,
      payhereEnabled: false,
      paymentsLkEnabled: true,
    };
    const methods = getAvailablePaymentMethods(onlyPaymentsLk, true, 5000, false, true, true);
    expect(resolveDefaultPaymentMethod(methods, "+94771234567")).toBe("payments_lk");
  });

  it("honors an explicit payments_lk request", () => {
    const withPaymentsLk = { ...business, paymentsLkEnabled: true };
    const methods = getAvailablePaymentMethods(withPaymentsLk, true, 5000, true, true, true);
    expect(
      resolveOnlinePaymentMethod({ methods, requested: "payments_lk", clientPhone: "+94771234567" }),
    ).toBe("payments_lk");
  });
});
