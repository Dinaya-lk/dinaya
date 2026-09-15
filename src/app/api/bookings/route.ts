import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { bookings, services, staff, clients, staffServices, staffLocations } from "@/db/schema";
import { eq, and, lt, gt, gte, inArray, count } from "drizzle-orm";
import { sendBookingNotificationToBusiness } from "@/lib/resend";
import { sendBookingConfirmationMessage, sendBookingNotificationToBusinessMessage } from "@/lib/messaging/booking-messages";
import { buildClientBookingUrl } from "@/lib/client-tokens";
import type { Plan } from "@/lib/plan";
import type { BookingLanguage } from "@/lib/i18n";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logActivity } from "@/lib/activity-log";
import { processBookingAutomationTrigger } from "@/lib/automations/engine";
import { logRejectedSettled, runAfterResponse } from "@/lib/after-response";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { decryptSecret } from "@/lib/secrets";
import { getBusinessPaymentSettings } from "@/lib/payments/business-query";
import { resolveBookingLocationId } from "@/lib/locations";
import { isRequestedSlotAvailable, isDailyCapacityReached } from "@/lib/booking-availability";
import {
  getBookingIdempotencyResponse,
  hashBookingIdempotencyPayload,
  resolveBookingIdempotencyKey,
  storeBookingIdempotencyResponse,
} from "@/lib/booking-idempotency";
import {
  isSlotBlockedByReservation,
  releaseSlotReservation,
} from "@/lib/slot-reservations";
import {
  resolveBookingSource,
  resolveClientSource,
  type BookingAttribution,
} from "@/lib/booking-attribution";
import { canUseFeature, getBusinessPlan, PlanLimitError, requirePlanLimit } from "@/lib/plan";
import { validateIntakeAnswers, intakeAnswersInputSchema, type IntakeAnswer } from "@/lib/intake";
import { resolvePriceVariantSelection, type ServicePriceVariant } from "@/lib/service-variants";
import { withRateLimit } from "@/lib/rate-limit";
import { hasApiKeyAuth, requireApiKey } from "@/lib/api-key-auth";
import {
  VOICE_RECEPTIONIST_ROLLOUT,
  isVoiceReceptionistRolloutOpen,
} from "@/lib/voice-receptionist";
import { z } from "@/lib/validation";
import { startOfMonth } from "date-fns";
import { claimDealSlot } from "@/lib/deals/claim";
import { computeAmountDueFromDiscountedPrice, computeDiscountedPrice } from "@/lib/deals/pricing";
import { getDealForBooking } from "@/lib/deals/queries";
import { DealValidationError, validateDealForBooking } from "@/lib/deals/validation";
import { startBookingCheckout } from "@/lib/payments/checkout";
import {
  getAvailablePaymentMethods,
  resolveOnlinePaymentMethod,
} from "@/lib/payments/resolve";

const bookingSchema = z.object({
  businessId: z.uuid(),
  serviceId: z.uuid(),
  staffId: z.uuid(),
  locationId: z.uuid().optional().nullable(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  clientName: z.string().trim().min(1).max(100),
  clientPhone: z.string().trim().min(7).max(30),
  clientEmail: z.email().optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().nullable(),
  intakeAnswers: intakeAnswersInputSchema.optional().nullable(),
  priceVariantId: z.string().trim().min(1).max(40).optional().nullable(),
  dealId: z.uuid().optional().nullable(),
  sessionToken: z.string().min(16).max(64).optional().nullable(),
  paymentMethod: z.enum(["payhere", "paypal", "payments_lk", "manual"]).optional().nullable(),
  source: z.enum(["public", "manual", "api", "import", "voice_agent", "deals"]).optional(),
  attribution: z.object({
    utmSource: z.string().trim().max(80).optional().nullable(),
    utmMedium: z.string().trim().max(80).optional().nullable(),
    utmCampaign: z.string().trim().max(120).optional().nullable(),
    referralCode: z.string().trim().max(40).optional().nullable(),
    channel: z.string().trim().max(40).optional().nullable(),
  }).optional().nullable(),
});

function isOverlapConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; cause?: { code?: string } };
  return maybe.code === "23P01" || maybe.cause?.code === "23P01";
}

async function finalizeBookingResponse(
  input: {
    idempotencyKey: string | null;
    businessId: string;
    requestHash: string | null;
    body: unknown;
    status?: number;
  },
) {
  if (input.idempotencyKey && input.requestHash) {
    await storeBookingIdempotencyResponse({
      businessId: input.businessId,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      responseStatus: input.status ?? 200,
      responseBody: input.body,
    });
  }

  return NextResponse.json(input.body, { status: input.status ?? 200 });
}

export async function POST(req: NextRequest) {
  const limited = await withRateLimit(req, {
    scope: "bookings",
    limit: 20,
    windowSeconds: 60,
  });
  if (!limited.ok) return limited.response;

  const apiKeyAuth = hasApiKeyAuth(req);
  let apiBusinessId: string | null = null;
  let apiKeyScopes: string[] = [];
  if (apiKeyAuth) {
    const keyResult = await requireApiKey(req, "bookings:write");
    if (!keyResult.ok) return keyResult.response;
    apiBusinessId = keyResult.context.businessId;
    apiKeyScopes = keyResult.context.scopes;
  }

  const parsed = bookingSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the booking details.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    businessId,
    serviceId,
    staffId,
    locationId: requestedLocationId,
    startsAt,
    endsAt,
    clientName,
    clientEmail,
    notes,
    intakeAnswers,
    priceVariantId,
    dealId: requestedDealId,
    source: requestedSource = "public",
    attribution: requestedAttribution,
    sessionToken,
    paymentMethod: requestedPaymentMethod,
  } = parsed.data;
  const session = await auth();

  if (requestedSource === "voice_agent" && !isVoiceReceptionistRolloutOpen()) {
    return NextResponse.json(
      {
        error: VOICE_RECEPTIONIST_ROLLOUT.message,
        feature: "aiVoiceReceptionist",
        rollout: VOICE_RECEPTIONIST_ROLLOUT.status,
      },
      { status: 503 },
    );
  }

  if (apiKeyAuth && apiBusinessId !== businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isOwnerBooking = session?.user?.businessId === businessId;
  const isApiBooking = apiBusinessId !== null && apiBusinessId === businessId;

  if (!isOwnerBooking && !isApiBooking) {
    const businessLimited = await withRateLimit(
      req,
      { scope: "bookings-business", limit: 10, windowSeconds: 60 },
      { keySuffix: businessId },
    );
    if (!businessLimited.ok) return businessLimited.response;
  }

  if (isApiBooking && requestedSource === "voice_agent" && !apiKeyScopes.includes("voice:write")) {
    return NextResponse.json({ error: "Voice booking scope required." }, { status: 403 });
  }
  if (isApiBooking && requestedSource === "voice_agent") {
    const plan = await getBusinessPlan(businessId);
    if (!canUseFeature(plan, "aiVoiceReceptionist")) {
      return NextResponse.json({ error: "AI Voice Receptionist requires Growth or Managed Max." }, { status: 402 });
    }
  }
  const attribution = isOwnerBooking || isApiBooking
    ? null
    : (requestedAttribution as BookingAttribution | null | undefined);
  const source = isApiBooking
    ? (requestedSource === "voice_agent" ? "voice_agent" : "api")
    : isOwnerBooking
      ? requestedSource
      : requestedDealId || attribution?.channel === "deals"
        ? "deals"
        : resolveBookingSource(attribution);
  const clientSource = resolveClientSource(source, attribution);

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const clientPhone = normalizeSriLankanPhone(parsed.data.clientPhone);

  if (!clientPhone) {
    return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
  }

  const idempotencyKey = !isOwnerBooking && !isApiBooking
    ? resolveBookingIdempotencyKey(req.headers.get("Idempotency-Key"), sessionToken)
    : null;

  if (idempotencyKey) {
    const requestHash = hashBookingIdempotencyPayload({
      businessId,
      serviceId,
      staffId,
      startsAt,
      endsAt,
      clientPhone,
      priceVariantId,
    });
    const cached = await getBookingIdempotencyResponse({
      businessId,
      idempotencyKey,
      requestHash,
    });
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  const idempotencyRequestHash = idempotencyKey
    ? hashBookingIdempotencyPayload({
        businessId,
        serviceId,
        staffId,
        startsAt,
        endsAt,
        clientPhone,
        priceVariantId,
      })
    : null;

  if (end <= start) {
    return NextResponse.json({ error: "Booking end time must be after start time." }, { status: 400 });
  }

  const business = await getBusinessPaymentSettings(businessId);

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const [{ value: monthBookingCount }] = await db
    .select({ value: count() })
    .from(bookings)
    .where(and(eq(bookings.businessId, businessId), gte(bookings.createdAt, startOfMonth(new Date()))));
  try {
    await requirePlanLimit(businessId, "bookingsPerMonth", Number(monthBookingCount));
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: "This business isn't accepting online bookings right now." }, { status: 402 });
    }
    throw error;
  }

  const [service] = await db
    .select({
      id: services.id,
      name: services.name,
      priceLkr: services.priceLkr,
      depositPercent: services.depositPercent,
      requiresPayment: services.requiresPayment,
      durationMinutes: services.durationMinutes,
      beforeBuffer: services.beforeBuffer,
      afterBuffer: services.afterBuffer,
      minimumNoticeHours: services.minimumNoticeHours,
      maximumAdvanceDays: services.maximumAdvanceDays,
      dailyCapacity: services.dailyCapacity,
      intakeQuestions: services.intakeQuestions,
      priceVariants: services.priceVariants,
      isActive: services.isActive,
    })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.businessId, businessId)))
    .limit(1);

  if (!service || !service.isActive) {
    return NextResponse.json({ error: "Service is not available." }, { status: 400 });
  }

  // Never trust a client-submitted price: re-resolve the chosen option (if any)
  // against the service's own stored options, server-side, before any money math.
  const priceVariantResult = resolvePriceVariantSelection(service.priceVariants, priceVariantId);
  if (!priceVariantResult.ok) {
    if (!isOwnerBooking && !isApiBooking) {
      return NextResponse.json({ error: priceVariantResult.error }, { status: 400 });
    }
  }
  const resolvedPriceVariant: ServicePriceVariant | null = priceVariantResult.ok
    ? priceVariantResult.variant
    : null;
  const effectiveBasePriceLkr = resolvedPriceVariant?.priceLkr ?? service.priceLkr;
  const serviceDisplayName = resolvedPriceVariant
    ? `${service.name} (${resolvedPriceVariant.label})`
    : service.name;

  const [staffMember] = await db
    .select({
      id: staff.id,
      name: staff.name,
      isActive: staff.isActive,
    })
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
    .limit(1);

  if (!staffMember || !staffMember.isActive) {
    return NextResponse.json({ error: "Staff member is not available." }, { status: 400 });
  }

  const [eligible] = await db
    .select({ staffId: staffServices.staffId })
    .from(staffServices)
    .where(and(eq(staffServices.staffId, staffId), eq(staffServices.serviceId, serviceId)))
    .limit(1);

  if (!eligible) {
    return NextResponse.json({ error: "This staff member cannot perform the selected service." }, { status: 400 });
  }

  let resolvedLocationId: string;
  try {
    resolvedLocationId = await resolveBookingLocationId(businessId, requestedLocationId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid branch." },
      { status: 400 }
    );
  }

  const [staffAtLocation] = await db
    .select({ staffId: staffLocations.staffId })
    .from(staffLocations)
    .where(and(eq(staffLocations.staffId, staffId), eq(staffLocations.locationId, resolvedLocationId)))
    .limit(1);

  const [{ value: locationAssignmentCount }] = await db
    .select({ value: count() })
    .from(staffLocations)
    .innerJoin(staff, eq(staff.id, staffLocations.staffId))
    .where(eq(staff.businessId, businessId));

  if (Number(locationAssignmentCount) > 0 && !staffAtLocation) {
    return NextResponse.json(
      { error: "This staff member is not available at the selected branch." },
      { status: 400 }
    );
  }

  let claimedDealId: string | null = null;
  let discountedPriceLkr: number | null = null;
  let validatedDealId: string | null = null;

  if (requestedDealId) {
    const deal = await getDealForBooking(requestedDealId, businessId);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    try {
      validateDealForBooking({
        deal,
        businessId,
        serviceId,
        staffId,
        locationId: resolvedLocationId,
        appointmentStart: start,
      });
    } catch (error) {
      if (error instanceof DealValidationError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }

    validatedDealId = deal.id;
    discountedPriceLkr = computeDiscountedPrice(effectiveBasePriceLkr, deal.discountPercent);
  }

  const amountDueLkr = discountedPriceLkr !== null
    ? computeAmountDueFromDiscountedPrice(discountedPriceLkr, service.depositPercent)
    : service.depositPercent > 0
      ? Math.ceil((effectiveBasePriceLkr * service.depositPercent) / 100)
      : effectiveBasePriceLkr;

  const hasPayhereSecret = Boolean(decryptSecret(business.payhereMerchantSecret));
  const hasPaypalSecret = Boolean(decryptSecret(business.paypalClientSecret));
  const hasPaymentsLkSecret = Boolean(decryptSecret(business.paymentsLkSecretKey));
  const paymentMethods = getAvailablePaymentMethods(
    business,
    service.requiresPayment,
    amountDueLkr,
    hasPayhereSecret,
    hasPaypalSecret,
    hasPaymentsLkSecret,
  );

  const publicPaymentRequired = Boolean(
    !isOwnerBooking &&
      !isApiBooking &&
      service.requiresPayment &&
      amountDueLkr > 0,
  );

  const onlinePaymentMethod = publicPaymentRequired
    ? resolveOnlinePaymentMethod({
        methods: paymentMethods,
        requested:
          requestedPaymentMethod === "payhere" ||
          requestedPaymentMethod === "paypal" ||
          requestedPaymentMethod === "payments_lk"
            ? requestedPaymentMethod
            : undefined,
        clientPhone,
      })
    : null;

  const manualPaymentRequired = Boolean(
    publicPaymentRequired &&
      !onlinePaymentMethod &&
      paymentMethods.includes("manual"),
  );

  if (publicPaymentRequired && !onlinePaymentMethod && !manualPaymentRequired) {
    return NextResponse.json(
      { error: "This business isn't set up to accept online payments yet." },
      { status: 400 },
    );
  }

  const requiresPendingPayment = Boolean(onlinePaymentMethod || manualPaymentRequired);
  const initialStatus = requiresPendingPayment ? "pending" : "confirmed";

  const expectedEnd = new Date(start.getTime() + service.durationMinutes * 60_000);
  if (Math.abs(expectedEnd.getTime() - end.getTime()) > 60_000) {
    return NextResponse.json({ error: "Booking duration does not match the selected service." }, { status: 400 });
  }

  // Public bookings must land on a slot the booking page would actually offer
  // (working hours, blocked days, minimum notice, no past times). The UI only
  // shows valid slots, but a direct API caller could submit any time — so
  // enforce it server-side. Owner/manual and API-key bookings may book freely.
  let storedIntakeAnswers: IntakeAnswer[] | null = null;

  if (!isOwnerBooking && !isApiBooking) {
    const slotAvailable = await isRequestedSlotAvailable({
      staffId,
      start,
      durationMinutes: service.durationMinutes,
      beforeBuffer: service.beforeBuffer,
      afterBuffer: service.afterBuffer,
      minimumNoticeHours: service.minimumNoticeHours,
      maximumAdvanceDays: service.maximumAdvanceDays ?? undefined,
      timezone: business.timezone ?? undefined,
      businessId,
      locationId: resolvedLocationId,
    });
    if (!slotAvailable) {
      return NextResponse.json(
        { error: "That time isn't available. Please pick another slot." },
        { status: 409 }
      );
    }

    const capacityReached = await isDailyCapacityReached({
      staffId,
      serviceId,
      start,
      timezone: business.timezone ?? "Asia/Colombo",
      dailyCapacity: service.dailyCapacity,
    });
    if (capacityReached) {
      return NextResponse.json(
        { error: "This service is fully booked for the selected day." },
        { status: 409 },
      );
    }

    const blockedByHold = await isSlotBlockedByReservation(staffId, start, end, sessionToken ?? undefined);
    if (blockedByHold) {
      return NextResponse.json(
        { error: "This slot was just taken. Please pick another time." },
        { status: 409 },
      );
    }

    // Intake questions are a Pro+ feature; only enforce/store answers when the
    // business is entitled. Owner/API bookings skip required-question enforcement.
    const intakePlan = await getBusinessPlan(businessId);
    const intakeQuestions = canUseFeature(intakePlan, "intakeForms")
      ? service.intakeQuestions ?? []
      : [];
    const intakeResult = validateIntakeAnswers(intakeQuestions, intakeAnswers ?? []);
    if (!intakeResult.ok) {
      return NextResponse.json({ error: intakeResult.error }, { status: 400 });
    }
    storedIntakeAnswers = intakeResult.answers.length > 0 ? intakeResult.answers : null;
  }

  // Fast pre-check. The database exclusion constraint is the final race guard.
  const conflict = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.staffId, staffId),
        inArray(bookings.status, ["pending", "confirmed"]),
        lt(bookings.startsAt, end),
        gt(bookings.endsAt, start)
      )
    )
    .limit(1);

  if (conflict.length > 0) {
    return NextResponse.json(
      { error: "This slot was just taken. Please pick another time." },
      { status: 409 }
    );
  }

  // Upsert client record — match by phone within this business
  const [client] = await db
    .insert(clients)
    .values({
      businessId,
      name: clientName,
      phone: clientPhone,
      email: clientEmail || null,
      stage: "active",
      source: clientSource,
    })
    .onConflictDoUpdate({
      target: [clients.businessId, clients.phone],
      set: {
        name: clientName,
        email: clientEmail || null,
        stage: "active",
        ...(clientSource !== "booking_page" && { source: clientSource }),
      },
    })
    .returning({ id: clients.id });

  let booking: { id: string } | undefined;

  try {
    [booking] = await db
      .insert(bookings)
      .values({
        businessId,
        serviceId,
        staffId,
        locationId: resolvedLocationId,
        clientId: client.id,
        clientName,
        clientPhone,
        clientEmail: clientEmail || null,
        startsAt: start,
        endsAt: end,
        status: initialStatus,
        source,
        dealId: validatedDealId,
        discountedPriceLkr,
        attribution: attribution && Object.values(attribution).some(Boolean) ? attribution : null,
        notes: notes || null,
        intakeAnswers: storedIntakeAnswers,
        priceVariant: resolvedPriceVariant,
      })
      .returning({ id: bookings.id });
  } catch (error) {
    if (isOverlapConstraintError(error)) {
      return NextResponse.json(
        { error: "This slot was just taken. Please pick another time." },
        { status: 409 }
      );
    }
    throw error;
  }

  if (!booking) {
    return NextResponse.json({ error: "Could not create booking." }, { status: 500 });
  }

  if (sessionToken) {
    await releaseSlotReservation(businessId, sessionToken);
  }

  if (validatedDealId) {
    const claimed = await claimDealSlot(validatedDealId);
    if (!claimed) {
      await db
        .update(bookings)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: "Deal sold out during booking.",
        })
        .where(eq(bookings.id, booking.id));
      return NextResponse.json({ error: "This deal just sold out." }, { status: 409 });
    }
    claimedDealId = claimed.id;
  }

  void logActivity({
    action: "created",
    businessId,
    entity: "booking",
    entityId: booking.id,
    meta: { source, status: initialStatus, dealId: claimedDealId },
  }).catch((error) => {
    console.error("Activity log write failed:", error);
  });

  void import("@/lib/admin-acquisition")
    .then(({ markFirstBookingAt }) => markFirstBookingAt(businessId))
    .catch((error) => {
      console.error("first_booking_at update failed:", error);
    });

  // Fire webhook for booking creation
  void dispatchWebhooks(businessId, "booking.created", {
    bookingId: booking.id,
    status: initialStatus,
    clientName,
    clientPhone,
    clientEmail: clientEmail || null,
    serviceName: service.name,
    staffName: staffMember.name,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  });

  void processBookingAutomationTrigger(businessId, booking.id, "booking.created").catch((error) => {
    console.error("Automation trigger failed:", error);
  });

  if (initialStatus === "confirmed") {
    void processBookingAutomationTrigger(businessId, booking.id, "booking.confirmed").catch((error) => {
      console.error("Automation trigger failed:", error);
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  if (initialStatus === "confirmed") {
    const manageUrl = buildClientBookingUrl({
      bookingId: booking.id,
      clientPhone,
    });

    runAfterResponse("booking notifications", async () => {
      const results = await Promise.allSettled([
        sendBookingConfirmationMessage({
          businessId,
          bookingId: booking.id,
          clientId: client.id,
          clientName,
          clientEmail: clientEmail || null,
          clientPhone,
          businessName: business.name,
          serviceName: serviceDisplayName,
          staffName: staffMember.name,
          startsAt: new Date(startsAt),
          manageUrl,
          plan: business.plan as Plan,
          language: business.language as BookingLanguage,
        }),
        business.email
          ? sendBookingNotificationToBusiness({
              clientName,
              clientEmail: business.email,
              businessName: business.name,
              businessSlug: business.slug,
              serviceName: serviceDisplayName,
              staffName: staffMember.name,
              startsAt: new Date(startsAt),
              bookingId: booking.id,
            })
          : Promise.resolve(),
        business.phone
          ? sendBookingNotificationToBusinessMessage({
              businessId,
              bookingId: booking.id,
              businessPhone: business.phone,
              businessName: business.name,
              clientName,
              serviceName: serviceDisplayName,
              staffName: staffMember.name,
              startsAt: new Date(startsAt),
              plan: business.plan as Plan,
            })
          : Promise.resolve(),
      ]);
      logRejectedSettled("booking notifications", results);
    });

    return finalizeBookingResponse({
      idempotencyKey,
      businessId,
      requestHash: idempotencyRequestHash,
      body: {
        bookingId: booking.id,
        manualPayment: manualPaymentRequired,
        status: initialStatus,
      },
    });
  }

  try {
    const checkout = await startBookingCheckout({
      bookingId: booking.id,
      businessId,
      business,
      serviceName: serviceDisplayName,
      depositPercent: service.depositPercent,
      clientName,
      clientPhone,
      clientEmail: clientEmail || null,
      amountLkr: amountDueLkr,
      requiresPayment: service.requiresPayment,
      appUrl,
      paymentMethod: onlinePaymentMethod,
    });

    if (checkout.kind === "manual") {
      return finalizeBookingResponse({
        idempotencyKey,
        businessId,
        requestHash: idempotencyRequestHash,
        body: {
          bookingId: booking.id,
          manualPayment: true,
          status: "pending",
        },
      });
    }

    if (checkout.kind === "payhere") {
      return finalizeBookingResponse({
        idempotencyKey,
        businessId,
        requestHash: idempotencyRequestHash,
        body: {
          bookingId: booking.id,
          provider: "payhere",
          payhereFormData: checkout.payhereFormData,
          payhereUrl: checkout.payhereUrl,
        },
      });
    }

    if (checkout.kind === "paypal") {
      return finalizeBookingResponse({
        idempotencyKey,
        businessId,
        requestHash: idempotencyRequestHash,
        body: {
          bookingId: booking.id,
          provider: "paypal",
          approvalUrl: checkout.approvalUrl,
        },
      });
    }

    if (checkout.kind === "payments_lk") {
      return finalizeBookingResponse({
        idempotencyKey,
        businessId,
        requestHash: idempotencyRequestHash,
        body: {
          bookingId: booking.id,
          provider: "payments_lk",
          checkoutUrl: checkout.checkoutUrl,
        },
      });
    }

    return finalizeBookingResponse({
      idempotencyKey,
      businessId,
      requestHash: idempotencyRequestHash,
      body: {
        bookingId: booking.id,
        status: checkout.status,
      },
    });
  } catch (error) {
    await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: "Payment setup failed.",
      })
      .where(eq(bookings.id, booking.id));

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment checkout." },
      { status: 400 },
    );
  }
}
