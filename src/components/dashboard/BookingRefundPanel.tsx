"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { dashboardInputClass, dashboardSectionClass } from "@/lib/dashboard-ui";
import { formatLkr, cn } from "@/lib/utils";
import { refundInstructions } from "@/lib/payments/refund";

export type BookingPaymentSummary = {
  id: string;
  amountLkr: number;
  refundedAmountLkr: number;
  status: "pending" | "success" | "failed" | "refunded";
  provider: string | null;
  orderId: string | null;
};

type Props = {
  bookingId: string;
  payment: BookingPaymentSummary;
  onUpdated: (payment: BookingPaymentSummary) => void;
};

export function BookingRefundPanel({ bookingId, payment, onUpdated }: Props) {
  const remaining = Math.max(0, payment.amountLkr - payment.refundedAmountLkr);
  const canRefund = remaining > 0 && (payment.status === "success" || payment.status === "refunded");
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const requested = Number(amount);
    const res = await fetch(`/api/dashboard/bookings/${bookingId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountLkr: Number.isFinite(requested) ? requested : remaining,
        reason: reason.trim() || undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      payment?: BookingPaymentSummary;
    };
    setSaving(false);
    if (!res.ok || !data.payment) {
      setError(data.error ?? "Could not record the refund.");
      return;
    }
    onUpdated(data.payment);
    setOpen(false);
    setReason("");
    setAmount(String(Math.max(0, data.payment.amountLkr - data.payment.refundedAmountLkr)));
  }

  return (
    <div className={cn(dashboardSectionClass, "space-y-3")}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Payment
      </p>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tabular-nums">{formatLkr(payment.amountLkr)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {payment.provider ? payment.provider : "Payment"}
            {payment.orderId ? ` · ${payment.orderId}` : ""}
          </p>
          {payment.refundedAmountLkr > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Refunded {formatLkr(payment.refundedAmountLkr)}
            </p>
          ) : null}
        </div>
        <StatusBadge status={payment.status} />
      </div>
      {canRefund ? (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {refundInstructions(payment.provider)}
          </p>
          <label className="block text-sm font-medium">
            Refund amount (LKR)
            <input
              type="number"
              min={1}
              max={remaining}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={cn(dashboardInputClass, "mt-1 tabular-nums")}
            />
          </label>
          <label className="block text-sm font-medium">
            Reason (optional)
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={cn(dashboardInputClass, "mt-1")}
              placeholder="Client cancelled, duplicate charge…"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => setOpen(true)}
            disabled={saving}
          >
            Record refund
          </Button>
        </>
      ) : null}

      <DashboardConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Record this refund?"
        description={`This marks LKR ${amount || remaining} as refunded on the booking. Send the money back in ${payment.provider === "payhere" ? "PayHere" : payment.provider === "paypal" ? "PayPal" : "your bank or LankaQR"} first if you have not already.`}
        confirmLabel={saving ? "Saving…" : "Record refund"}
        variant="destructive"
        onConfirm={() => {
          void submit();
        }}
      />
    </div>
  );
}
