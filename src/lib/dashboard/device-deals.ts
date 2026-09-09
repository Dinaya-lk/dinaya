import { fromZonedTime } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, deals, locations, services, staff, staffServices } from "@/db/schema";
import { logActivity } from "@/lib/activity-log";
import { getDealDashboardDetail, type DashboardDealDetail } from "@/lib/dashboard/deals";
import { notifyDealAudience } from "@/lib/deals/notify";
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

export const deviceDealCreateSchema = z.object({
  serviceId: z.uuid(),
  locationId: z.uuid(),
  staffId: z.uuid().optional().nullable(),
  discountPercent: z.number().int().min(10).max(50),
  slotsTotal: z.number().int().min(1).max(20),
  dealWindowStart: z.iso.datetime({ offset: true, local: true }),
  dealWindowEnd: z.iso.datetime({ offset: true, local: true }),
  apptWindowStart: z.iso.datetime({ offset: true, local: true }),
  apptWindowEnd: z.iso.datetime({ offset: true, local: true }),
  notifyClients: z.boolean().optional().default(false),
});

export type DeviceDealCreateInput = z.infer<typeof deviceDealCreateSchema>;
export type DeviceDealDetail = NonNullable<DashboardDealDetail>;

export type CreateDeviceDealResult =
  | { status: "created"; deal: DeviceDealDetail }
  | { status: "invalid"; error: string }
  | { status: "not_found"; error: string };

function isInvalidDate(value: Date): boolean {
  return Number.isNaN(value.getTime());
}

async function loadBusinessTimezone(businessId: string): Promise<string> {
  const [business] = await db
    .select({ timezone: businesses.timezone })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  return business?.timezone ?? DEFAULT_TIMEZONE;
}

export async function createDeviceDeal(
  businessId: string,
  input: unknown,
): Promise<CreateDeviceDealResult> {
  const parsed = deviceDealCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", error: "Please check the deal details." };
  }

  const data = parsed.data;
  const timezone = await loadBusinessTimezone(businessId);
  const dealWindowStart = parseDeviceDateTime(data.dealWindowStart, timezone);
  const dealWindowEnd = parseDeviceDateTime(data.dealWindowEnd, timezone);
  const apptWindowStart = parseDeviceDateTime(data.apptWindowStart, timezone);
  const apptWindowEnd = parseDeviceDateTime(data.apptWindowEnd, timezone);

  if (
    isInvalidDate(dealWindowStart)
    || isInvalidDate(dealWindowEnd)
    || isInvalidDate(apptWindowStart)
    || isInvalidDate(apptWindowEnd)
  ) {
    return { status: "invalid", error: "Please check the deal details." };
  }

  if (dealWindowEnd <= dealWindowStart) {
    return { status: "invalid", error: "Deal end must be after deal start." };
  }
  if (apptWindowEnd <= apptWindowStart) {
    return { status: "invalid", error: "Appointment end must be after appointment start." };
  }

  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(
      eq(services.id, data.serviceId),
      eq(services.businessId, businessId),
      eq(services.isActive, true),
    ))
    .limit(1);
  if (!service) {
    return { status: "not_found", error: "Service not found." };
  }

  const [location] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(
      eq(locations.id, data.locationId),
      eq(locations.businessId, businessId),
      eq(locations.isActive, true),
    ))
    .limit(1);
  if (!location) {
    return { status: "not_found", error: "Location not found." };
  }

  if (data.staffId) {
    const [staffMember] = await db
      .select({ id: staff.id })
      .from(staff)
      .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
      .where(and(
        eq(staff.id, data.staffId),
        eq(staff.businessId, businessId),
        eq(staff.isActive, true),
        eq(staffServices.serviceId, data.serviceId),
      ))
      .limit(1);
    if (!staffMember) {
      return { status: "invalid", error: "Staff member cannot perform this service." };
    }
  }

  const [deal] = await db
    .insert(deals)
    .values({
      businessId,
      locationId: data.locationId,
      serviceId: data.serviceId,
      staffId: data.staffId ?? null,
      discountPercent: data.discountPercent,
      slotsTotal: data.slotsTotal,
      dealWindowStart,
      dealWindowEnd,
      apptWindowStart,
      apptWindowEnd,
      status: "active",
    })
    .returning({ id: deals.id });

  if (!deal) {
    return { status: "invalid", error: "Could not create deal." };
  }

  void logActivity({
    businessId,
    entity: "deal",
    entityId: deal.id,
    action: "created",
    meta: {
      serviceId: data.serviceId,
      discountPercent: data.discountPercent,
      slotsTotal: data.slotsTotal,
      notifyClients: data.notifyClients,
    },
  }).catch((error) => {
    console.error("Activity log write failed:", error);
  });

  if (data.notifyClients) {
    await notifyDealAudience({
      businessId,
      dealId: deal.id,
      audience: "past_clients",
    });
  }

  const detail = await getDealDashboardDetail(businessId, deal.id);
  if (!detail) {
    return { status: "not_found", error: "Not found." };
  }

  return { status: "created", deal: detail };
}
