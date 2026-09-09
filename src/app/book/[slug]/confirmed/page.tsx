import { db } from "@/db";
import { bookings, businesses, reviews, services, staff } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import Link from "next/link";
import ReviewPrompt from "./ReviewPrompt";
import PaymentStatusPoller from "./PaymentStatusPoller";
import AddToCalendar from "./AddToCalendar";
import SuccessRedirect from "./SuccessRedirect";
import ConfettiCelebration from "./ConfettiCelebration";
import { buildClientBookingUrl } from "@/lib/client-tokens";
import { createReviewToken } from "@/lib/ai/review-links";
import { getBookingCopy } from "@/lib/i18n";
import { buildBookingShareText, buildWhatsAppShareUrl } from "@/lib/booking-share";
import { Icon } from "@/components/ui/Icon";
import { hasPublicColumn } from "@/lib/dashboard/db-compat";
import BookingBranding from "@/components/booking/BookingBranding";
import { canUseFeature, resolveEffectivePlan } from "@/lib/plan";
import { resolveBookingTheme } from "@/lib/booking-theme";
import { BookingTheme } from "@/components/booking/BookingTheme";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function BookingConfirmedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { bookingId } = await searchParams;

  if (!bookingId) notFound();

  const [includeSuccessRedirect, includeAccentColor] = await Promise.all([
    hasPublicColumn("services", "success_redirect_url"),
    hasPublicColumn("businesses", "accent_color"),
  ]);

  const [booking] = await db
    .select({
      id: bookings.id,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      businessName: businesses.name,
      businessLanguage: businesses.language,
      businessTimezone: businesses.timezone,
      cancellationPolicy: businesses.cancellationPolicy,
      depositPolicy: businesses.depositPolicy,
      businessPlan: businesses.plan,
      businessPlanExpiresAt: businesses.planExpiresAt,
      businessHideDinayaBranding: businesses.hideDinayaBranding,
      ...(includeAccentColor ? { businessAccentColor: businesses.accentColor } : {}),
      serviceName: services.name,
      ...(includeSuccessRedirect ? { successRedirectUrl: services.successRedirectUrl } : {}),
      staffName: staff.name,
    })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(staff, eq(staff.id, bookings.staffId))
    .where(and(eq(bookings.id, bookingId), eq(businesses.slug, slug)))
    .limit(1);
  if (!booking) notFound();

  const copy = getBookingCopy(booking.businessLanguage);
  const timezone = booking.businessTimezone ?? "Asia/Colombo";

  const effectivePlan = resolveEffectivePlan({
    storedPlan: booking.businessPlan,
    planExpiresAt: booking.businessPlanExpiresAt,
  });
  const hideBranding = Boolean(
    booking.businessHideDinayaBranding && canUseFeature(effectivePlan, "publicBookingPageCustomization"),
  );

  const theme = resolveBookingTheme({
    accentColor: includeAccentColor
      ? ((booking as { businessAccentColor?: string | null }).businessAccentColor ?? null)
      : null,
  });

  const [existingReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.bookingId, booking.id))
    .limit(1);

  const local = toZonedTime(booking.startsAt, timezone);
  const isConfirmed = booking.status === "confirmed" || booking.status === "completed";
  const isPending = booking.status === "pending";
  const reviewToken = createReviewToken({
    bookingId: booking.id,
    businessSlug: slug,
    clientName: booking.clientName,
  });

  const manageUrl = buildClientBookingUrl({
    bookingId: booking.id,
    clientPhone: booking.clientPhone,
  });

  const shareText = buildBookingShareText({
    businessName: booking.businessName,
    serviceName: booking.serviceName,
    startsAt: booking.startsAt,
    timezone,
    manageUrl,
  });
  const whatsappUrl = buildWhatsAppShareUrl(shareText);

  const successRedirectUrl = includeSuccessRedirect
    ? (booking as { successRedirectUrl?: string | null }).successRedirectUrl ?? null
    : null;

  const dateLine = format(local, "EEEE, d MMMM");
  const timeLine = format(local, "h:mm a");

  return (
    <BookingTheme
      theme={theme}
      className="booking-page-bg flex min-h-dvh items-start justify-center px-4 py-10 md:py-14"
    >
      {isConfirmed ? <ConfettiCelebration /> : null}
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:p-8">
          <div
            className={`mx-auto flex size-12 items-center justify-center rounded-full ${
              isConfirmed ? "bg-emerald-500" : "bg-amber-500"
            }`}
          >
            <Icon
              name={isConfirmed ? "check-lg" : "hourglass-split"}
              className="text-xl text-white"
            />
          </div>

          <h1 className="mt-5 text-center font-cal text-xl tracking-tight text-foreground md:text-2xl">
            {isConfirmed ? copy.confirmedTitle : isPending ? copy.paymentPendingTitle : copy.requestReceivedTitle}
          </h1>

          {!isPending ? (
            <div className="mt-5 text-center">
              <p className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {timeLine}
              </p>
              <p className="mt-1.5 text-base text-muted-foreground">{dateLine}</p>
              <p className="mt-4 text-sm text-foreground">
                {booking.serviceName}
                <span className="text-muted-foreground"> · {booking.businessName}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{copy.detailWith} {booking.staffName}</p>
            </div>
          ) : (
            <p className="mt-3 text-center text-sm text-muted-foreground">{copy.paymentPendingDetail}</p>
          )}

          {isPending ? (
            <div className="mt-4">
              <PaymentStatusPoller bookingId={booking.id} slug={slug} copy={copy} />
            </div>
          ) : null}

          {successRedirectUrl && isConfirmed ? (
            <SuccessRedirect
              redirectUrl={successRedirectUrl}
              context={{
                bookingId: booking.id,
                service: booking.serviceName,
                staff: booking.staffName,
                status: booking.status,
                startsAt: booking.startsAt.toISOString(),
              }}
              copy={copy}
            />
          ) : null}

          {!isPending && (
            <div className="mt-6 space-y-6 border-t border-border pt-6">
              {(booking.cancellationPolicy || booking.depositPolicy) && (
                <div className="space-y-4 text-left text-xs text-muted-foreground">
                  <p className="text-[13px] font-medium text-muted-foreground">
                    {copy.whatHappensNext}
                  </p>
                  {booking.depositPolicy ? (
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{copy.depositPolicy}</p>
                      <p className="mt-1 leading-relaxed whitespace-pre-wrap">{booking.depositPolicy}</p>
                    </div>
                  ) : null}
                  {booking.cancellationPolicy ? (
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{copy.cancellationPolicy}</p>
                      <p className="mt-1 leading-relaxed whitespace-pre-wrap">{booking.cancellationPolicy}</p>
                    </div>
                  ) : null}
                </div>
              )}

              <AddToCalendar
                bookingId={booking.id}
                slug={slug}
                title={`${booking.serviceName} · ${booking.businessName}`}
                description={`Booking for ${booking.clientName} with ${booking.staffName}`}
                startsAt={booking.startsAt}
                endsAt={booking.endsAt}
                labels={{
                  addToCalendar: copy.addToCalendar,
                  downloadIcs: copy.downloadIcs,
                  googleCalendar: copy.googleCalendar,
                  appleCalendar: copy.appleCalendar,
                }}
              />
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {copy.refLabel}: <span className="font-mono">{booking.id.slice(0, 8).toUpperCase()}</span>
          </p>

          {(isConfirmed || isPending) && (
            <Link
              href={manageUrl}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {copy.manageBooking}
            </Link>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="whatsapp" className="text-base text-emerald-600" />
            {copy.shareOnWhatsApp}
          </a>

          <Link
            href={`/book/${slug}`}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-center text-sm booking-text-accent hover:underline"
          >
            ← {copy.backToBooking}
          </Link>

          {!hideBranding && (
            <div className="mt-6 flex justify-center">
              <BookingBranding copy={copy} businessSlug={slug} />
            </div>
          )}
        </div>

        {isConfirmed && !existingReview ? (
          <ReviewPrompt reviewToken={reviewToken} businessName={booking.businessName} />
        ) : null}
      </div>
    </BookingTheme>
  );
}
