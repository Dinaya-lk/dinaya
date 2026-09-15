"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

type CheckoutState =
  | { provider: "payhere"; payhereFormData: Record<string, string>; payhereUrl: string }
  | { provider: "paypal"; approvalUrl: string };

interface Props {
  slug: string;
  copy: {
    redirectingToPayment: string;
    payNow: string;
    paymentRedirectHint: string;
  };
}

export default function PaymentRedirect({ slug, copy }: Props) {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      setError("Missing booking reference.");
      return;
    }

    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ slug });
      const res = await fetch(`/api/bookings/${bookingId}/checkout?${params.toString()}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Unable to start checkout.");
        return;
      }

      if (data.provider === "paypal" && data.approvalUrl) {
        setCheckout({ provider: "paypal", approvalUrl: data.approvalUrl });
        return;
      }

      if (data.provider === "payhere" && data.payhereUrl && data.payhereFormData) {
        setCheckout({
          provider: "payhere",
          payhereUrl: data.payhereUrl,
          payhereFormData: data.payhereFormData,
        });
        return;
      }

      setError("Checkout is not available for this booking.");
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, slug]);

  useEffect(() => {
    if (!checkout) return;

    const timeoutId = window.setTimeout(() => {
      if (checkout.provider === "paypal") {
        window.location.href = checkout.approvalUrl;
        return;
      }
      formRef.current?.requestSubmit();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [checkout]);

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-xs dark:bg-neutral-900">
        <Icon name="exclamation-circle" className="mb-3 text-2xl text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs dark:bg-neutral-900">
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">{copy.redirectingToPayment}</p>
      </div>
    );
  }

  if (checkout.provider === "paypal") {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs dark:bg-neutral-900">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Icon name="credit-card" className="text-2xl text-primary" />
        </div>
        <h1 className="mb-2 font-cal text-xl text-foreground">{copy.redirectingToPayment}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{copy.paymentRedirectHint}</p>
        <a
          href={checkout.approvalUrl}
          className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {copy.payNow}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs dark:bg-neutral-900">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Icon name="credit-card" className="text-2xl text-primary" />
      </div>
      <h1 className="mb-2 font-cal text-xl text-foreground">{copy.redirectingToPayment}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{copy.paymentRedirectHint}</p>
      <form ref={formRef} method="POST" action={checkout.payhereUrl}>
        {Object.entries(checkout.payhereFormData).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <button
          type="submit"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {copy.payNow}
        </button>
      </form>
    </div>
  );
}
