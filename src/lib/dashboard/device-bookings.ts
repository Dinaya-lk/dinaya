import { fromZonedTime } from "date-fns-tz";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  businesses,
  clients,
  payments,
  services,
  staff,
  staffLocations,
  staffServices,
} from "@/db/schema";
import { logActivity } from "@/lib/activity-log";
import { isRequestedSlotAvailable } from "@/lib/booking-availability";
import { rescheduleBooking } from "@/lib/booking-reschedule";
import { isoDateString } from "@/lib/dashboard/serialization";
import { resolveBookingLocationId } from "@/lib/locations";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { z } from "@/lib/validation";

const DEFAULT_TIMEZONE = "Asia/Colombo";

function hasExplicitTimezone(raw: string): boolean {
  return /[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw);
}

function parseDeviceDateTime(raw: string, timezone: string): Date {
  if (hasExplicitTimezone(raw)) {
    return new Date(raw);
  }
  return fromZonedTime(raw, timezone);
}

export const DEVICE_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type DeviceBookingStatus = (typeof DEVICE_BOOKING_STATUSES)[number];
export type DeviceBookingActor = {
  channel?: "mobile" | "desktop";
};

export type DeviceBookingSummary = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  webUrl: string;
  revisionTs: string;
};

export type CreateDeviceWalkInBookingResult =
  | { status: "created"; booking: DeviceBookingSummary }
  | { status: "conflict"; error: string }
  | { status: "invalid"; error: string }
  | { status: "not_found"; error: string };

export type CancelDeviceBookingResult =
  | { status: "cancelled"; booking: { id: string; revisionTs: string; status: string } }
  | { status: "invalid"; error: string }
  | { status: "not_found"; error: string };

export type UpdateDeviceBookingResult =
  | { status: "conflict"; error: string }
  | { status: "invalid"; error: string }
  | { status: "not_found"; error: string }
  | { status: "updated"; booking: DeviceBookingSummary };

const sriLankanPhone = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .refine((value) => /^\+94\d{9}$/.test(normalizeSriLankanPhone(value)), {
    message: "A valid Sri Lankan phone number is required.",
  });

const optionalEmail = z.email().optional().nullable().or(z.literal(""));

export const deviceWalkInBookingSchema = z.object({
  clientEmail: optionalEmail,
  clientName: z.string().trim().min(1).max(100),
  clientPhone: sriLankanPhone,
  locationId: z.uuid().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  serviceId: z.uuid(),
  staffId: z.uuid().optional(),
  startsAt: z.iso.datetime({ local: true }),
});

export const deviceBookingUpdateSchema = z
  .object({
    clientEmail: optionalEmail,
    clientName: z.string().trim().min(1).max(100).optional(),
    clientPhone: sriLankanPhone.optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    serviceId: z.uuid().optional(),
    staffId: z.uuid().optional(),
    startsAt: z.iso.datetime({ local: true }).optional(),
    status: z.enum(DEVICE_BOOKING_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const deviceBookingCancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

type ServiceRow = {
  afterBuffer: number;
  beforeBuffer: number;
  durationMinutes: number;
  id: string;
  isActive: boolean;
  maximumAdvanceDays: number | null;
  minimumNoticeHours: number;
  name: string;
};

type StaffRow = {
  id: string;
  isActive: boolean;
  name: string;
};

function isOverlapConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; cause?: { code?: string } };
  return maybe.code === "23P01" || maybe.cause?.code === "23P01";
}

function isDeviceBookingStatus(value: string): value is DeviceBookingStatus {
  return DEVICE_BOOKING_STATUSES.includes(value as DeviceBookingStatus);
}

function resolveChannel(options?: DeviceBookingActor): "mobile" | "desktop" {
  return options?.channel === "mobile" ? "mobile" : "desktop";
}

function createdAction(channel: "mobile" | "desktop"): "created_mobile" | "created_desktop" {
  switch (channel) {
    case "mobile":
      return "created_mobile";
    case "desktop":
      return "created_desktop";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

function cancelledAction(channel: "mobile" | "desktop"): "cancelled_mobile" | "cancelled_desktop" {
  switch (channel) {
    case "mobile":
      return "cancelled_mobile";
    case "desktop":
      return "cancelled_desktop";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

function updatedAction(channel: "mobile" | "desktop"): "updated_mobile" | "updated_desktop" {
  switch (channel) {
    case "mobile":
      return "updated_mobile";
    case "desktop":
      return "updated_desktop";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export function allowedDeviceBookingTransitions(status: DeviceBookingStatus): DeviceBookingStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["completed", "no_show", "cancelled"];
    case "cancelled":
    case "completed":
    case "no_show":
      return [];
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function transitionError(from: DeviceBookingStatus, to: DeviceBookingStatus): string {
  return `Cannot change a ${from.replace("_", " ")} booking to ${to.replace("_", " ")}.`;
}

function normalizeOptionalEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  return value;
}

function bookingWebUrl(id: string): string {
  return `/dashboard/bookings/${id}`;
}

function toDeviceBookingSummary(input: {
  clientEmail: string | null;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  createdAt: Date;
  endsAt: Date;
  id: string;
  serviceName: string;
  source: string;
  staffId: string | null;
  staffName: string;
  startsAt: Date;
  status: string;
}): DeviceBookingSummary {
  return {
    id: input.id,
    clientId: input.clientId,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    serviceName: input.serviceName,
    staffId: input.staffId,
    staffName: input.staffName,
    startsAt: isoDateString(input.startsAt),
    endsAt: isoDateString(input.endsAt),
    status: input.status,
    source: input.source,
    webUrl: bookingWebUrl(input.id),
    revisionTs: isoDateString(input.createdAt),
  };
}

async function loadBusinessTimezone(businessId: string): Promise<string> {
  const [business] = await db
    .select({ timezone: businesses.timezone })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  return business?.timezone ?? DEFAULT_TIMEZONE;
}

async function loadService(businessId: string, serviceId: string): Promise<ServiceRow | null> {
  const [service] = await db
    .select({
      afterBuffer: services.afterBuffer,
      beforeBuffer: services.beforeBuffer,
      durationMinutes: services.durationMinutes,
      id: services.id,
      isActive: services.isActive,
      maximumAdvanceDays: services.maximumAdvanceDays,
      minimumNoticeHours: services.minimumNoticeHours,
      name: services.name,
    })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.businessId, businessId)))
    .limit(1);

  if (!service || !service.isActive) return null;
  return service;
}

async function loadStaffById(businessId: string, staffId: string): Promise<StaffRow | null> {
  const [member] = await db
    .select({
      id: staff.id,
      isActive: staff.isActive,
      name: staff.name,
    })
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
    .limit(1);
  return member ?? null;
}

async function resolveWalkInStaff(
  businessId: string,
  serviceId: string,
  staffId: string | undefined,
): Promise<{ staff: StaffRow } | { status: "invalid" | "not_found"; error: string }> {
  if (staffId) {
    const member = await loadStaffById(businessId, staffId);
    if (!member) {
      return { status: "not_found", error: "Staff member is not available." };
    }
    if (!member.isActive) {
      return { status: "invalid", error: "Staff member is not available." };
    }
    return { staff: member };
  }

  const [assigned] = await db
    .select({
      id: staff.id,
      isActive: staff.isActive,
      name: staff.name,
    })
    .from(staff)
    .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
    .where(
      and(
        eq(staff.businessId, businessId),
        eq(staff.isActive, true),
        eq(staffServices.serviceId, serviceId),
      ),
    )
    .orderBy(asc(staff.name))
    .limit(1);

  if (assigned) return { staff: assigned };

  const [fallback] = await db
    .select({
      id: staff.id,
      isActive: staff.isActive,
      name: staff.name,
    })
    .from(staff)
    .where(and(eq(staff.businessId, businessId), eq(staff.isActive, true)))
    .orderBy(asc(staff.name))
    .limit(1);

  if (!fallback) {
    return { status: "invalid", error: "No staff members are available." };
  }
  return { staff: fallback };
}

async function resolveWalkInLocationId(
  businessId: string,
  staffId: string,
  locationId: string | undefined,
): Promise<{ locationId: string } | { status: "invalid"; error: string }> {
  const assignedLocations = await db
    .select({
      isPrimary: staffLocations.isPrimary,
      locationId: staffLocations.locationId,
    })
    .from(staffLocations)
    .where(eq(staffLocations.staffId, staffId));

  const preferred = assignedLocations.find((row) => row.isPrimary) ?? assignedLocations[0];
  try {
    const resolved = await resolveBookingLocationId(
      businessId,
      locationId ?? preferred?.locationId ?? null,
    );
    return { locationId: resolved };
  } catch (error) {
    return {
      status: "invalid",
      error: error instanceof Error ? error.message : "Invalid branch.",
    };
  }
}

async function hasUnpaidPayherePayment(bookingId: string): Promise<boolean> {
  const [unpaidPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "pending")))
    .limit(1);
  return Boolean(unpaidPayment);
}

async function loadDeviceBookingSummary(
  businessId: string,
  id: string,
): Promise<DeviceBookingSummary | null> {
  const [row] = await db
    .select({
      clientEmail: bookings.clientEmail,
      clientId: bookings.clientId,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      createdAt: bookings.createdAt,
      endsAt: bookings.endsAt,
      id: bookings.id,
      serviceName: services.name,
      source: bookings.source,
      staffId: bookings.staffId,
      staffName: staff.name,
      startsAt: bookings.startsAt,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(staff, eq(bookings.staffId, staff.id))
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!row) return null;
  return toDeviceBookingSummary(row);
}

export async function createDeviceWalkInBooking(
  businessId: string,
  input: unknown,
  options?: DeviceBookingActor,
): Promise<CreateDeviceWalkInBookingResult> {
  const parsed = deviceWalkInBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", error: "Please check the booking details." };
  }

  const clientPhone = normalizeSriLankanPhone(parsed.data.clientPhone);
  if (!clientPhone) {
    return { status: "invalid", error: "A valid phone number is required." };
  }

  const clientEmail = normalizeOptionalEmail(parsed.data.clientEmail);
  const clientName = parsed.data.clientName;
  const notes = parsed.data.notes?.trim() ? parsed.data.notes.trim() : null;
  const channel = resolveChannel(options);

  const timezone = await loadBusinessTimezone(businessId);
  const start = parseDeviceDateTime(parsed.data.startsAt, timezone);
  const service = await loadService(businessId, parsed.data.serviceId);
  if (!service) {
    return { status: "not_found", error: "Service is not available." };
  }

  const staffResult = await resolveWalkInStaff(businessId, service.id, parsed.data.staffId);
  if ("error" in staffResult) return staffResult;
  const staffMember = staffResult.staff;

  const locationResult = await resolveWalkInLocationId(
    businessId,
    staffMember.id,
    parsed.data.locationId,
  );
  if ("error" in locationResult) return locationResult;

  const slotAvailable = await isRequestedSlotAvailable({
    afterBuffer: service.afterBuffer,
    beforeBuffer: service.beforeBuffer,
    businessId,
    durationMinutes: service.durationMinutes,
    locationId: locationResult.locationId,
    maximumAdvanceDays: service.maximumAdvanceDays ?? undefined,
    minimumNoticeHours: service.minimumNoticeHours,
    staffId: staffMember.id,
    start,
    timezone,
  });
  if (!slotAvailable) {
    return { status: "conflict", error: "That time is no longer available." };
  }

  const endsAt = new Date(start.getTime() + service.durationMinutes * 60_000);

  const [client] = await db
    .insert(clients)
    .values({
      businessId,
      email: clientEmail,
      name: clientName,
      phone: clientPhone,
      source: "manual",
      stage: "active",
    })
    .onConflictDoUpdate({
      set: {
        email: clientEmail,
        name: clientName,
        source: "manual",
        stage: "active",
      },
      target: [clients.businessId, clients.phone],
    })
    .returning({ id: clients.id });

  if (!client) {
    return { status: "invalid", error: "Could not save the client." };
  }

  let booking: {
    clientEmail: string | null;
    clientId: string | null;
    clientName: string;
    clientPhone: string;
    createdAt: Date;
    endsAt: Date;
    id: string;
    source: string;
    staffId: string | null;
    startsAt: Date;
    status: string;
  } | undefined;

  try {
    [booking] = await db
      .insert(bookings)
      .values({
        businessId,
        clientEmail,
        clientId: client.id,
        clientName,
        clientPhone,
        endsAt,
        locationId: locationResult.locationId,
        notes,
        serviceId: service.id,
        source: "manual",
        staffId: staffMember.id,
        startsAt: start,
        status: "confirmed",
      })
      .returning({
        clientEmail: bookings.clientEmail,
        clientId: bookings.clientId,
        clientName: bookings.clientName,
        clientPhone: bookings.clientPhone,
        createdAt: bookings.createdAt,
        endsAt: bookings.endsAt,
        id: bookings.id,
        source: bookings.source,
        staffId: bookings.staffId,
        startsAt: bookings.startsAt,
        status: bookings.status,
      });
  } catch (error) {
    if (isOverlapConstraintError(error)) {
      return { status: "conflict", error: "That time is no longer available." };
    }
    throw error;
  }

  if (!booking) {
    return { status: "invalid", error: "Could not create booking." };
  }

  void logActivity({
    action: createdAction(channel),
    businessId,
    entity: "booking",
    entityId: booking.id,
    meta: { source: "manual", status: "confirmed" },
  }).catch((error) => {
    console.error("Device booking activity log write failed:", error);
  });

  return {
    status: "created",
    booking: toDeviceBookingSummary({
      ...booking,
      serviceName: service.name,
      staffName: staffMember.name,
    }),
  };
}

export async function cancelDeviceBooking(
  businessId: string,
  id: string,
  reason?: string | null,
  options?: DeviceBookingActor,
): Promise<CancelDeviceBookingResult> {
  const [existing] = await db
    .select({
      createdAt: bookings.createdAt,
      id: bookings.id,
      status: bookings.status,
    })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!existing) {
    return { status: "not_found", error: "Not found." };
  }

  if (!isDeviceBookingStatus(existing.status)) {
    return { status: "invalid", error: "This booking cannot be cancelled." };
  }

  if (existing.status === "cancelled") {
    return { status: "invalid", error: transitionError(existing.status, "cancelled") };
  }

  if (!allowedDeviceBookingTransitions(existing.status).includes("cancelled")) {
    return { status: "invalid", error: transitionError(existing.status, "cancelled") };
  }

  const [updated] = await db
    .update(bookings)
    .set({
      cancelledAt: new Date(),
      cancellationReason: reason?.trim() || "Cancelled from device",
      status: "cancelled",
    })
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .returning({
      createdAt: bookings.createdAt,
      id: bookings.id,
      status: bookings.status,
    });

  if (!updated) {
    return { status: "not_found", error: "Not found." };
  }

  void logActivity({
    action: cancelledAction(resolveChannel(options)),
    businessId,
    entity: "booking",
    entityId: updated.id,
    meta: { from: existing.status, to: "cancelled" },
  }).catch((error) => {
    console.error("Device booking activity log write failed:", error);
  });

  return {
    status: "cancelled",
    booking: {
      id: updated.id,
      revisionTs: isoDateString(updated.createdAt),
      status: updated.status,
    },
  };
}

export async function updateDeviceBooking(
  businessId: string,
  id: string,
  input: unknown,
  options?: DeviceBookingActor,
): Promise<UpdateDeviceBookingResult> {
  const parsed = deviceBookingUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", error: "Please check the booking update." };
  }

  const patch = parsed.data;
  const channel = resolveChannel(options);

  const [existing] = await db
    .select({
      afterBuffer: services.afterBuffer,
      beforeBuffer: services.beforeBuffer,
      clientEmail: bookings.clientEmail,
      clientId: bookings.clientId,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      createdAt: bookings.createdAt,
      durationMinutes: services.durationMinutes,
      endsAt: bookings.endsAt,
      id: bookings.id,
      locationId: bookings.locationId,
      maximumAdvanceDays: services.maximumAdvanceDays,
      minimumNoticeHours: services.minimumNoticeHours,
      notes: bookings.notes,
      serviceId: bookings.serviceId,
      serviceName: services.name,
      staffId: bookings.staffId,
      staffName: staff.name,
      startsAt: bookings.startsAt,
      status: bookings.status,
      timezone: businesses.timezone,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(staff, eq(bookings.staffId, staff.id))
    .innerJoin(businesses, eq(bookings.businessId, businesses.id))
    .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
    .limit(1);

  if (!existing) {
    return { status: "not_found", error: "Not found." };
  }

  if (!existing.serviceId || !existing.staffId) {
    return { status: "invalid", error: "This booking is missing staff or service information." };
  }

  if (!isDeviceBookingStatus(existing.status)) {
    return { status: "invalid", error: "This booking can no longer be changed." };
  }

  if (existing.status === "cancelled" || existing.status === "completed" || existing.status === "no_show") {
    if (patch.status || patch.startsAt || patch.staffId || patch.serviceId) {
      return { status: "invalid", error: "This booking can no longer be changed." };
    }
  }

  let nextService: ServiceRow = {
    afterBuffer: existing.afterBuffer,
    beforeBuffer: existing.beforeBuffer,
    durationMinutes: existing.durationMinutes,
    id: existing.serviceId,
    isActive: true,
    maximumAdvanceDays: existing.maximumAdvanceDays,
    minimumNoticeHours: existing.minimumNoticeHours,
    name: existing.serviceName,
  };

  if (patch.serviceId && patch.serviceId !== existing.serviceId) {
    const service = await loadService(businessId, patch.serviceId);
    if (!service) {
      return { status: "not_found", error: "Service is not available." };
    }
    nextService = service;
  }

  let nextStaff: StaffRow = {
    id: existing.staffId,
    isActive: true,
    name: existing.staffName,
  };

  if (patch.staffId && patch.staffId !== existing.staffId) {
    const member = await loadStaffById(businessId, patch.staffId);
    if (!member) {
      return { status: "not_found", error: "Staff member is not available." };
    }
    if (!member.isActive) {
      return { status: "invalid", error: "Staff member is not available." };
    }
    nextStaff = member;
  }

  const nextStart = patch.startsAt
    ? parseDeviceDateTime(patch.startsAt, existing.timezone ?? DEFAULT_TIMEZONE)
    : existing.startsAt;
  const nextEndsAt = new Date(nextStart.getTime() + nextService.durationMinutes * 60_000);
  const staffChanging = Boolean(patch.staffId && patch.staffId !== existing.staffId);
  const startChanging = Boolean(patch.startsAt && nextStart.getTime() !== existing.startsAt.getTime());
  const serviceChanging = Boolean(patch.serviceId && patch.serviceId !== existing.serviceId);

  let nextLocationId = existing.locationId;
  if (staffChanging) {
    const locationResult = await resolveWalkInLocationId(businessId, nextStaff.id, undefined);
    if ("error" in locationResult) return locationResult;
    nextLocationId = locationResult.locationId;
  }

  if (startChanging || staffChanging || serviceChanging) {
    const slotAvailable = await isRequestedSlotAvailable({
      afterBuffer: nextService.afterBuffer,
      beforeBuffer: nextService.beforeBuffer,
      businessId,
      durationMinutes: nextService.durationMinutes,
      excludeBookingId: existing.id,
      locationId: nextLocationId,
      maximumAdvanceDays: nextService.maximumAdvanceDays ?? undefined,
      minimumNoticeHours: nextService.minimumNoticeHours,
      staffId: nextStaff.id,
      start: nextStart,
      timezone: existing.timezone ?? DEFAULT_TIMEZONE,
    });
    if (!slotAvailable) {
      return { status: "conflict", error: "That time is no longer available." };
    }
  }

  if (patch.status && patch.status !== existing.status) {
    if (!allowedDeviceBookingTransitions(existing.status).includes(patch.status)) {
      return { status: "invalid", error: transitionError(existing.status, patch.status) };
    }
    if (existing.status === "pending" && patch.status === "confirmed") {
      if (await hasUnpaidPayherePayment(existing.id)) {
        return {
          status: "invalid",
          error: "This booking has an unpaid PayHere payment and cannot be confirmed yet.",
        };
      }
    }
  }

  if (staffChanging) {
    await db
      .update(bookings)
      .set({
        locationId: nextLocationId,
        staffId: nextStaff.id,
      })
      .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)));
  }

  if (startChanging) {
    const result = await rescheduleBooking({
      bookingId: id,
      businessId,
      endsAt: nextEndsAt,
      source: "dashboard",
      startsAt: nextStart,
    });
    if (!result.ok) {
      if (result.status === 409) return { status: "conflict", error: result.error };
      if (result.status === 404) return { status: "not_found", error: result.error };
      return { status: "invalid", error: result.error };
    }
  }

  const nextPhone = patch.clientPhone ? normalizeSriLankanPhone(patch.clientPhone) : undefined;
  const fieldPatch: Partial<{
    cancelledAt: Date;
    cancellationReason: string;
    clientEmail: string | null;
    clientName: string;
    clientPhone: string;
    endsAt: Date;
    notes: string | null;
    serviceId: string;
    status: DeviceBookingStatus;
  }> = {
    ...(patch.clientName !== undefined && { clientName: patch.clientName }),
    ...(nextPhone !== undefined && { clientPhone: nextPhone }),
    ...(patch.clientEmail !== undefined && { clientEmail: normalizeOptionalEmail(patch.clientEmail) }),
    ...(patch.notes !== undefined && { notes: patch.notes?.trim() ? patch.notes.trim() : null }),
    ...(serviceChanging && { serviceId: nextService.id }),
    ...(serviceChanging && !startChanging && { endsAt: nextEndsAt }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.status === "cancelled" && existing.status !== "cancelled"
      ? { cancelledAt: new Date(), cancellationReason: "Cancelled from device" }
      : {}),
  };

  if (Object.keys(fieldPatch).length > 0) {
    const [updated] = await db
      .update(bookings)
      .set(fieldPatch)
      .where(and(eq(bookings.id, id), eq(bookings.businessId, businessId)))
      .returning({ id: bookings.id });
    if (!updated) {
      return { status: "not_found", error: "Not found." };
    }
  }

  const summary = await loadDeviceBookingSummary(businessId, id);
  if (!summary) {
    return { status: "not_found", error: "Not found." };
  }

  void logActivity({
    action: updatedAction(channel),
    businessId,
    entity: "booking",
    entityId: id,
    meta: {
      staffChanged: staffChanging,
      startChanged: startChanging,
      status: patch.status,
    },
  }).catch((error) => {
    console.error("Device booking activity log write failed:", error);
  });

  return { status: "updated", booking: summary };
}
