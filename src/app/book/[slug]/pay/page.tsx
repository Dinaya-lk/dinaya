import { Suspense } from "react";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBookingCopy } from "@/lib/i18n";
import PaymentRedirect from "./PaymentRedirect";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookingPayPage({ params }: Props) {
  const { slug } = await params;

  const [business] = await db
    .select({ language: businesses.language })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);

  if (!business) notFound();

  const copy = getBookingCopy(business.language);

  return (
    <div className="flex min-h-dvh items-start justify-center bg-muted/40 px-4 py-12 dark:bg-neutral-950">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs dark:bg-neutral-900">
              <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="text-sm text-muted-foreground">{copy.redirectingToPayment}</p>
            </div>
          }
        >
          <PaymentRedirect
            slug={slug}
            copy={{
              redirectingToPayment: copy.redirectingToPayment,
              payNow: copy.payNow,
              paymentRedirectHint: copy.paymentRedirectHint,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
