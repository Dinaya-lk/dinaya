export type RefundablePaymentStatus = "pending" | "success" | "failed" | "refunded";

export type PlanRefundInput = {
  status: RefundablePaymentStatus;
  amountLkr: number;
  refundedAmountLkr: number;
  requestedAmountLkr?: number | null;
};

export type PlanRefundResult =
  | {
      ok: true;
      amountLkr: number;
      nextRefundedTotal: number;
      nextStatus: "success" | "refunded";
    }
  | { ok: false; error: string };

export function planRefund(input: PlanRefundInput): PlanRefundResult {
  if (input.status !== "success" && input.status !== "refunded") {
    return { ok: false, error: "Only collected payments can be refunded." };
  }

  const alreadyRefunded = Math.max(0, input.refundedAmountLkr);
  const remaining = input.amountLkr - alreadyRefunded;
  if (remaining <= 0) {
    return { ok: false, error: "This payment is already fully refunded." };
  }

  const requested =
    input.requestedAmountLkr == null ? remaining : Math.round(input.requestedAmountLkr);
  if (!Number.isFinite(requested) || requested <= 0) {
    return { ok: false, error: "Enter a refund amount greater than zero." };
  }
  if (requested > remaining) {
    return {
      ok: false,
      error: `Refund cannot exceed the remaining LKR ${remaining.toLocaleString("en-LK")}.`,
    };
  }

  const nextRefundedTotal = alreadyRefunded + requested;
  return {
    ok: true,
    amountLkr: requested,
    nextRefundedTotal,
    nextStatus: nextRefundedTotal >= input.amountLkr ? "refunded" : "success",
  };
}

export function refundInstructions(provider: string | null | undefined): string {
  switch (provider) {
    case "paypal":
      return "Issue the refund in PayPal, then record it here so the booking stays in sync.";
    case "manual":
      return "Send the money back by bank transfer or LankaQR, then record it here.";
    case "payhere":
      return "Issue the refund in your PayHere merchant dashboard, then record it here. PayHere usually takes 5–7 working days.";
    default:
      return "Issue the refund through the original payment method, then record it here.";
  }
}
