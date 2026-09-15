"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import IPhoneMockup from "@/components/ui/iphone-mockup";
import { buttonVariants } from "@/components/ui/button";
import { dashboardSectionClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

type Props = {
  previewSrc: string;
  /** @deprecated No longer used for decoration; kept for caller compatibility. */
  accentColor?: string;
  bookingUrl: string;
  className?: string;
};

export function BookingPagePreviewPanel({
  previewSrc,
  bookingUrl,
  className,
}: Props) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [previewSrc]);

  return (
    <div
      className={cn(
        dashboardSectionClass,
        "relative overflow-hidden p-4 xl:sticky xl:top-6 xl:self-start",
        className,
      )}
    >
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-cal text-base tracking-tight text-foreground">Live preview</h2>
          <p className="text-xs text-muted-foreground">Updates as you edit</p>
        </div>
        <Link
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-10 shrink-0")}
        >
          Open live page
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-2 shadow-xs sm:p-4">
        <div className="relative flex justify-center">
          <div className="hidden xl:block">
            <IPhoneMockup model="15-pro" scale={0.72} color="space-black">
              {loading ? (
                <div className="flex h-full min-h-[520px] items-center justify-center bg-muted/40 text-xs text-muted-foreground">
                  Loading preview…
                </div>
              ) : null}
              <iframe
                src={previewSrc}
                title="Booking page preview"
                onLoad={() => setLoading(false)}
                className="h-full min-h-[520px] w-full border-0 bg-white"
              />
            </IPhoneMockup>
          </div>
          <div className="w-full xl:hidden">
            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground">
                Loading preview…
              </div>
            ) : null}
            <iframe
              src={previewSrc}
              title="Booking page preview"
              onLoad={() => setLoading(false)}
              className="h-[min(65vh,640px)] w-full rounded-2xl border border-border/60 bg-card"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
