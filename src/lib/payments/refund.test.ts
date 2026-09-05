import { describe, expect, it } from "vitest";
import { planRefund, refundInstructions, requestedRefundAmountLkr } from "./refund";

describe("planRefund", () => {
  it("refunds the remaining amount by default", () => {
    expect(
      planRefund({ status: "success", amountLkr: 5500, refundedAmountLkr: 0 }),
    ).toEqual({
      ok: true,
      amountLkr: 5500,
      nextRefundedTotal: 5500,
      nextStatus: "refunded",
    });
  });

  it("supports partial refunds", () => {
    expect(
      planRefund({
        status: "success",
        amountLkr: 5500,
        refundedAmountLkr: 0,
        requestedAmountLkr: 1500,
      }),
    ).toEqual({
      ok: true,
      amountLkr: 1500,
      nextRefundedTotal: 1500,
      nextStatus: "success",
    });
  });

  it("rejects over-refunds and unpaid payments", () => {
    expect(
      planRefund({
        status: "success",
        amountLkr: 1000,
        refundedAmountLkr: 400,
        requestedAmountLkr: 700,
      }).ok,
    ).toBe(false);
    expect(planRefund({ status: "pending", amountLkr: 1000, refundedAmountLkr: 0 }).ok).toBe(false);
    expect(
      planRefund({ status: "refunded", amountLkr: 1000, refundedAmountLkr: 1000 }).ok,
    ).toBe(false);
  });
});

describe("requestedRefundAmountLkr", () => {
  it("rounds decimals and omits invalid amounts so remaining can be refunded", () => {
    expect(requestedRefundAmountLkr(1500.4)).toBe(1500);
    expect(requestedRefundAmountLkr("1500.6")).toBe(1501);
    expect(requestedRefundAmountLkr(0)).toBeUndefined();
    expect(requestedRefundAmountLkr("")).toBeUndefined();
    expect(requestedRefundAmountLkr("abc")).toBeUndefined();
  });
});

describe("refundInstructions", () => {
  it("points owners at the right place to send money back", () => {
    expect(refundInstructions("payhere")).toContain("PayHere");
    expect(refundInstructions("manual")).toContain("bank transfer");
  });
});
