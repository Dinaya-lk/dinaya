"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import type { BookingBusiness, BookingState } from "./BookingWizard";
import { Icon } from "@/components/ui/Icon";
import { cn, formatLkr, isOptimizableRemoteImage } from "@/lib/utils";
import type { BookingCopy } from "@/lib/i18n";
import { readStoredAttribution } from "@/lib/booking-attribution";
import { getBookingSessionToken } from "@/lib/booking-session";
import { computeAmountDueFromDiscountedPrice, computeDiscountedPrice } from "@/lib/deals/pricing";
import { trackBookingComplete, trackDealBookingComplete, trackDealBookingStart } from "@/lib/analytics/gtag";
import {
  getAvailablePaymentMethods,
  resolveDefaultPaymentMethod,
} from "@/lib/payments/resolve";
import type { DealListItem } from "@/lib/deals/queries";
import { BookingSubmitButton } from "./BookingSubmitButton";
import {
  validateConfirmFields,
  firstConfirmFieldId,
  type ConfirmFieldErrors,
} from "./booking-confirm-validation";
import type { IntakeQuestion } from "@/lib/intake";

interface Props {
  state: BookingState;
  business: BookingBusiness;
  copy: BookingCopy;
  selectedDeal?: DealListItem | null;
  sessionToken?: string;
  slotUnavailable?: boolean;
  onUpdate: (partial: Partial<BookingState>) => void;
  onBack: () => void;
  onConfirmed: (data: {
    bookingId: string;
    manualPayment?: boolean;
    payhereFormData?: Record<string, string>;
    payhereUrl?: string;
    approvalUrl?: string;
    provider?: string;
    status?: string;
  }) => void;
  variant?: "inline" | "full";
  formId?: string;
  /** When the wizard shows breadcrumbs, hide the duplicate inline back link. */
  hideInlineBack?: boolean;
  /** When breadcrumbs already show the step name, hide the in-form heading. */
  hideDetailsHeading?: boolean;
  /** Solid pink panel — avoid white form chrome. */
  onAccentPanel?: boolean;
}

const fieldBaseCls =
  "mt-1.5 w-full min-h-11 rounded-xl border px-3 py-2.5 text-base transition-shadow placeholder:text-muted-foreground focus:outline-none focus:ring-2 md:text-sm";
const fieldOkCls = `${fieldBaseCls} border-border bg-card focus:border-[var(--booking-accent)] focus:ring-[var(--booking-accent-soft)]`;
const fieldErrCls = `${fieldBaseCls} border-destructive bg-card focus:border-destructive focus:ring-destructive/25`;

function fieldErrorId(field: string) {
  return `confirm-error-${field}`;
}

function LankaQrImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      alt="LankaQR"
      width={144}
      height={144}
      className="h-36 w-36 rounded-lg border border-border bg-card object-contain p-2"
      unoptimized={!isOptimizableRemoteImage(src)}
      onError={() => setFailed(true)}
    />
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
      <Icon name="exclamation-circle" className="shrink-0 text-xs" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

function IntakeField({
  question,
  value,
  error,
  copy,
  onChange,
}: {
  question: IntakeQuestion;
  value: string;
  error?: string;
  copy: BookingCopy;
  onChange: (value: string) => void;
}) {
  const id = `intake-${question.id}`;
  const errorId = fieldErrorId(`intake-${question.id}`);
  const cls = error ? fieldErrCls : fieldOkCls;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {question.label}{" "}
        {question.required ? (
          <span className="font-normal text-muted-foreground">*</span>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        )}
      </label>
      {question.sensitive ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{copy.intakePrivacy}</p>
      ) : null}
      {question.type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          rows={2}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} resize-none`}
        />
      ) : question.type === "select" ? (
        <select
          id={id}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        >
          <option value="">Choose an option…</option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : question.type === "boolean" ? (
        <select
          id={id}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        >
          <option value="">Choose yes or no…</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
      {error ? <FieldError id={errorId} message={error} /> : null}
    </div>
  );
}

function focusFirstInvalidField(fieldId: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(fieldId);
    if (!(el instanceof HTMLElement)) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export default function StepConfirm({
  state,
  business,
  copy,
  selectedDeal,
  sessionToken,
  slotUnavailable = false,
  onUpdate,
  onBack,
  onConfirmed,
  variant = "full",
  formId = "booking-contact-form",
  hideInlineBack = false,
  hideDetailsHeading = false,
  onAccentPanel = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ConfirmFieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [upsell, setUpsell] = useState<{
    name: string;
    priceLkr: number;
    reason: string;
  } | null>(null);

  const service = state.service;
  const panelCardCls = onAccentPanel
    ? "rounded-xl border border-border/80 p-4"
    : "rounded-xl border border-border bg-card p-4";
  const formShellCls = onAccentPanel
    ? "space-y-4"
    : "space-y-4 md:rounded-xl md:border md:border-border md:bg-card md:p-6";
  const intakeQuestions = useMemo(
    () => service?.intakeQuestions ?? [],
    [service?.intakeQuestions],
  );

  const validationMessages = useMemo(
    () => ({
      nameRequired: copy.fieldRequired,
      phoneRequired: copy.fieldRequired,
      phoneInvalid: copy.invalidPhone,
      emailInvalid: copy.invalidEmail,
      intakeRequired: (label: string) => `${copy.fieldRequired}: ${label}`,
    }),
    [copy],
  );

  const liveValidation = useMemo(
    () =>
      validateConfirmFields({
        clientName: state.clientName,
        clientPhone: state.clientPhone,
        clientEmail: state.clientEmail,
        intakeQuestions,
        intakeAnswers: state.intakeAnswers,
        messages: validationMessages,
      }),
    [
      state.clientName,
      state.clientPhone,
      state.clientEmail,
      state.intakeAnswers,
      intakeQuestions,
      validationMessages,
    ],
  );

  const discountedPrice =
    service && selectedDeal
      ? computeDiscountedPrice(service.priceLkr, selectedDeal.discountPercent)
      : service?.priceLkr ?? 0;
  const depositAmount =
    service && service.depositPercent > 0
      ? selectedDeal
        ? computeAmountDueFromDiscountedPrice(discountedPrice, service.depositPercent)
        : Math.ceil((service.priceLkr * service.depositPercent) / 100)
      : discountedPrice;
  const dueNow =
    service?.requiresPayment && discountedPrice > 0
      ? service.depositPercent > 0
        ? depositAmount
        : discountedPrice
      : 0;

  const onlineMethods = getAvailablePaymentMethods(
    {
      payhereEnabled: Boolean(business.payhereEnabled),
      payhereMerchantId: business.payhereEnabled ? "configured" : null,
      payhereMerchantSecret: business.payhereEnabled ? "configured" : null,
      paypalEnabled: Boolean(business.paypalEnabled),
      paypalClientId: business.paypalEnabled ? "configured" : null,
      paypalClientSecret: business.paypalEnabled ? "configured" : null,
      bankTransferInstructions: business.bankTransferInstructions ?? null,
      lankaqrImageUrl: business.lankaqrImageUrl ?? null,
    },
    Boolean(service?.requiresPayment),
    dueNow,
    Boolean(business.payhereEnabled),
    Boolean(business.paypalEnabled),
  ).filter((method) => method === "payhere" || method === "paypal") as Array<"payhere" | "paypal">;

  const [paymentMethod, setPaymentMethod] = useState<"payhere" | "paypal">(() =>
    resolveDefaultPaymentMethod(onlineMethods, state.clientPhone) === "paypal" ? "paypal" : "payhere",
  );

  useEffect(() => {
    const next = resolveDefaultPaymentMethod(onlineMethods, state.clientPhone);
    if (next === "payhere" || next === "paypal") {
      setPaymentMethod(next);
    }
  }, [onlineMethods, state.clientPhone]);

  const dateLabel = state.date
    ? format(parseISO(state.date + "T12:00:00"), "EEEE, d MMMM")
    : "";
  const yearLabel = state.date ? format(parseISO(state.date + "T12:00:00"), "yyyy") : "";

  const hasManualPaymentFallback = Boolean(
    service?.requiresPayment &&
      service.priceLkr > 0 &&
      !business.payhereEnabled &&
      (business.bankTransferInstructions || business.lankaqrImageUrl),
  );

  const payLabel =
    service?.requiresPayment && !hasManualPaymentFallback && dueNow > 0
      ? `${copy.confirmAndPay} — ${formatLkr(dueNow)}`
      : copy.confirmBooking;

  useEffect(() => {
    if (!service || selectedDeal) {
      setUpsell(null);
      return;
    }
    const params = new URLSearchParams({
      businessId: business.id,
      serviceId: service.id,
    });
    if (state.location?.id) params.set("locationId", state.location.id);
    fetch(`/api/ai/upsell?${params}`)
      .then((res) => res.json())
      .then((data) => setUpsell(data.recommendation ?? null))
      .catch(() => setUpsell(null));
  }, [business.id, service, state.location?.id, selectedDeal]);

  useEffect(() => {
    if (selectedDeal) {
      trackDealBookingStart({
        dealId: selectedDeal.id,
        businessSlug: business.slug,
        serviceId: service?.id,
        discountPercent: selectedDeal.discountPercent,
      });
    }
  }, [selectedDeal, business.slug, service?.id]);

  function markTouched(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function showFieldError(key: keyof ConfirmFieldErrors) {
    if (!touched[key] && !fieldErrors[key]) return undefined;
    return liveValidation.errors[key] as string | undefined;
  }

  async function handleBook() {
    if (slotUnavailable) {
      setError(copy.slotTakenAction);
      return;
    }

    const result = validateConfirmFields({
      clientName: state.clientName,
      clientPhone: state.clientPhone,
      clientEmail: state.clientEmail,
      intakeQuestions,
      intakeAnswers: state.intakeAnswers,
      messages: validationMessages,
    });

    setFieldErrors(result.errors);
    setTouched({
      clientName: true,
      clientPhone: true,
      clientEmail: true,
      ...Object.fromEntries(intakeQuestions.map((q) => [`intake-${q.id}`, true])),
    });

    if (!result.valid) {
      setError(result.firstError ?? copy.fieldRequired);
      const fieldId = firstConfirmFieldId(result.errors, intakeQuestions);
      if (fieldId) focusFirstInvalidField(fieldId);
      return;
    }

    setLoading(true);
    setError("");

    const attribution = readStoredAttribution(business.id);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: business.id,
        serviceId: state.service!.id,
        staffId: state.staff!.id,
        locationId: state.location?.id ?? null,
        startsAt: state.timeSlot,
        endsAt: state.timeSlotEnd,
        clientName: state.clientName.trim(),
        clientPhone: state.clientPhone.trim(),
        clientEmail: state.clientEmail.trim(),
        notes: state.notes,
        intakeAnswers: Object.entries(state.intakeAnswers)
          .filter(([, v]) => v != null && v !== "")
          .map(([questionId, value]) => ({ questionId, value })),
        dealId: selectedDeal?.id ?? null,
        sessionToken: sessionToken || getBookingSessionToken() || undefined,
        paymentMethod: onlineMethods.length > 1 ? paymentMethod : onlineMethods[0] ?? undefined,
        attribution,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    trackBookingComplete({
      businessSlug: business.slug,
      serviceId: state.service?.id,
      bookingId: data.bookingId,
      amountLkr: discountedPrice,
      isDeal: Boolean(selectedDeal),
      requiresPayment: Boolean(service?.requiresPayment),
    });

    if (selectedDeal) {
      trackDealBookingComplete({
        dealId: selectedDeal.id,
        businessSlug: business.slug,
        discountPercent: selectedDeal.discountPercent,
        bookingId: data.bookingId,
        discountedPriceLkr: discountedPrice,
      });
    }

    onConfirmed({
      bookingId: data.bookingId,
      manualPayment: data.manualPayment,
      payhereFormData: data.payhereFormData,
      payhereUrl: data.payhereUrl,
      approvalUrl: data.approvalUrl,
      provider: data.provider,
      status: data.status,
    });
  }

  const summaryCards = (
    <div className="flex flex-col gap-2 md:gap-3">
      <div className={panelCardCls}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.appointment}
        </p>
        <p className="text-xl font-semibold tabular-nums text-foreground">{state.timeLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
        {yearLabel ? <p className="text-xs text-muted-foreground">{yearLabel}</p> : null}
        <p className="mt-3 text-sm text-foreground">
          {service?.name}
          {state.staff ? <span className="text-muted-foreground"> · {state.staff.name}</span> : null}
        </p>
      </div>

      {service && service.priceLkr > 0 && (
        <div className={panelCardCls}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{copy.fullAmount}</p>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {selectedDeal ? (
                <>
                  <span className="mr-2 text-sm font-normal text-muted-foreground line-through">
                    {formatLkr(service.priceLkr)}
                  </span>
                  {formatLkr(discountedPrice)}
                </>
              ) : (
                formatLkr(service.priceLkr)
              )}
            </p>
          </div>
          {service.requiresPayment && service.depositPercent > 0 && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {copy.depositDue} ({service.depositPercent}%)
              </p>
              <p className="font-medium tabular-nums booking-text-accent">{formatLkr(depositAmount)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const nameError = showFieldError("clientName");
  const phoneError = showFieldError("clientPhone");
  const emailError = showFieldError("clientEmail");

  const contactForm = (
    <div className={formShellCls}>
      {hideDetailsHeading ? (
        <h2 className="sr-only">{copy.details}</h2>
      ) : (
        <p className="text-base font-semibold text-foreground">{copy.details}</p>
      )}
      <div>
        <label htmlFor="clientName" className="text-sm font-medium text-foreground">
          Full name <span className="font-normal text-muted-foreground">*</span>
        </label>
        <input
          id="clientName"
          name="name"
          required
          type="text"
          autoComplete="name"
          value={state.clientName}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? fieldErrorId("clientName") : undefined}
          onBlur={() => markTouched("clientName")}
          onChange={(e) => onUpdate({ clientName: e.target.value })}
          className={nameError ? fieldErrCls : fieldOkCls}
          placeholder="Nimal Perera"
        />
        {nameError ? <FieldError id={fieldErrorId("clientName")} message={nameError} /> : null}
      </div>
      <div>
        <label htmlFor="clientPhone" className="text-sm font-medium text-foreground">
          Phone number <span className="font-normal text-muted-foreground">*</span>
        </label>
        <input
          id="clientPhone"
          name="tel"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={state.clientPhone}
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? fieldErrorId("clientPhone") : undefined}
          onBlur={() => markTouched("clientPhone")}
          onChange={(e) => onUpdate({ clientPhone: e.target.value })}
          className={phoneError ? fieldErrCls : fieldOkCls}
          placeholder="+94 77 123 4567"
        />
        {phoneError ? <FieldError id={fieldErrorId("clientPhone")} message={phoneError} /> : null}
      </div>
      <div>
        <label htmlFor="clientEmail" className="text-sm font-medium text-foreground">
          Email <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="clientEmail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={state.clientEmail}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? fieldErrorId("clientEmail") : undefined}
          onBlur={() => markTouched("clientEmail")}
          onChange={(e) => onUpdate({ clientEmail: e.target.value })}
          className={emailError ? fieldErrCls : fieldOkCls}
          placeholder="you@email.com"
        />
        {emailError ? <FieldError id={fieldErrorId("clientEmail")} message={emailError} /> : null}
      </div>
      <div>
        <label htmlFor="notes" className="text-sm font-medium text-foreground">
          Notes <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          value={state.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className={`${fieldOkCls} resize-none`}
          rows={2}
          placeholder={
            hasManualPaymentFallback ? copy.paymentReference : "Anything we should know?"
          }
        />
      </div>

      {intakeQuestions.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{copy.intakeSection}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.intakePrivacy}</p>
          </div>
          {intakeQuestions.map((q) => (
            <IntakeField
              key={q.id}
              question={q}
              value={state.intakeAnswers[q.id] ?? ""}
              error={
                touched[`intake-${q.id}`] || fieldErrors.intake?.[q.id]
                  ? liveValidation.errors.intake?.[q.id]
                  : undefined
              }
              copy={copy}
              onChange={(v) => {
                markTouched(`intake-${q.id}`);
                onUpdate({ intakeAnswers: { ...state.intakeAnswers, [q.id]: v } });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  const manualPaymentNotice =
    hasManualPaymentFallback ? (
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800/50 dark:bg-amber-950/40 md:mb-4">
        <p className="mb-2 font-medium text-amber-900 dark:text-amber-200">{copy.localPayment}</p>
        {business.bankTransferInstructions && (
          <p className="whitespace-pre-wrap text-amber-900 dark:text-amber-200/80">
            {business.bankTransferInstructions}
          </p>
        )}
        {business.lankaqrImageUrl && (
          <div className="mt-3">
            <LankaQrImage src={business.lankaqrImageUrl} />
          </div>
        )}
      </div>
    ) : null;

  const upsellNotice =
    upsell ? (
      <div className="mt-4 rounded-xl border border-[var(--booking-accent-soft)] bg-[var(--booking-accent-muted)]/70 p-4 text-sm">
        <p className="font-medium text-foreground">Recommended add-on</p>
        <p className="mt-1 booking-text-accent">
          {upsell.reason} Ask about <span className="font-semibold">{upsell.name}</span>
          {upsell.priceLkr > 0 ? ` (${formatLkr(upsell.priceLkr)})` : ""} during your visit.
        </p>
      </div>
    ) : null;

  const paymentMethodSelector =
    onlineMethods.length > 1 && service?.requiresPayment && dueNow > 0 ? (
      <div className={cn("mt-4 space-y-2", panelCardCls)}>
        <p className="text-sm font-medium text-foreground">{copy.paymentMethod}</p>
        {(
          [
            { id: "payhere" as const, label: copy.paymentMethodPayhere },
            { id: "paypal" as const, label: copy.paymentMethodPaypal },
          ] as const
        )
          .filter((option) => onlineMethods.includes(option.id))
          .map((option) => {
            const selected = paymentMethod === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                  selected
                    ? "border-[var(--booking-accent)] bg-[var(--booking-accent-muted)] text-foreground"
                    : onAccentPanel
                      ? "border-border/80 bg-white text-muted-foreground hover:bg-white/90"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={selected}
                  onChange={() => setPaymentMethod(option.id)}
                  className="size-4 shrink-0 accent-[var(--booking-accent)]"
                />
                {option.label}
              </label>
            );
          })}
      </div>
    ) : null;

  const submitError =
    error ? (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-card px-3 py-2.5 text-sm text-destructive">
        <Icon name="exclamation-circle" className="mt-0.5 shrink-0 text-sm" />
        <span>{error}</span>
      </div>
    ) : null;

  const trustStrip = (
    <div className="mt-2 flex items-center justify-center gap-1 lg:mt-3">
      <Icon name="shield-check" className="text-xs text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{copy.paymentSecure}</span>
    </div>
  );

  const slotUnavailableNotice =
    slotUnavailable ? (
      <div
        className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
        role="alert"
      >
        <p className="font-medium">{copy.slotTaken}</p>
        <p className="mt-1">{copy.slotTakenAction}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 min-h-11 text-sm font-medium booking-text-accent hover:underline"
        >
          {copy.pickDateTime}
        </button>
      </div>
    ) : null;

  const confirmActions = (
    <>
      <BookingSubmitButton
        loading={loading}
        disabled={loading || slotUnavailable}
        onClick={handleBook}
      >
        {payLabel}
      </BookingSubmitButton>
      {trustStrip}
    </>
  );

  if (variant === "inline") {
    return (
      <div id={formId} className="pb-28 lg:pb-0">
        {slotUnavailableNotice}
        {manualPaymentNotice}
        {contactForm}
        {paymentMethodSelector}
        {upsellNotice}
        {submitError}

        <div
          className={cn(
            "sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:relative lg:mx-0 lg:mt-6 lg:border-0 lg:px-0 lg:pb-0 lg:pt-0",
            onAccentPanel ? "booking-panel-surface border-border/80" : "bg-background",
          )}
        >
          {!hideInlineBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-3 flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {copy.back}
            </button>
          ) : null}
          {confirmActions}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 booking-panel-bg px-4 py-3 md:grid md:grid-cols-2 md:gap-8 md:bg-transparent md:px-8 md:py-7">
        <div>{summaryCards}</div>
        <div>
          {slotUnavailableNotice}
          {manualPaymentNotice}
          {contactForm}
          {paymentMethodSelector}
          {upsellNotice}
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-destructive/30 bg-card px-3 py-2.5 text-sm text-destructive md:mx-8">
          <Icon name="exclamation-circle" className="mt-0.5 shrink-0 text-sm" />
          <span>{error}</span>
        </div>
      )}

      <div className="sticky bottom-0 z-10 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:relative md:mt-6 md:border-0 md:bg-transparent md:px-8 md:pb-0 md:pt-0">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron-left" className="text-sm" /> {copy.back}
        </button>
        {confirmActions}
      </div>
    </div>
  );
}
