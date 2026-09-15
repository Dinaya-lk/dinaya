import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookingNotifications, bookings, businesses, locations, services, staff } from "@/db/schema";
import { eq, and, gte, lt, isNull, inArray } from "drizzle-orm";
import { addHours } from "date-fns";
import { canUseFeature, type Plan } from "@/lib/plan";
import { sendBookingReminderMessage } from "@/lib/messaging/booking-messages";
import { buildClientBookingUrl } from "@/lib/client-tokens";
import { acquireCronLock } from "@/lib/cron-lock";
import { getCronSecret } from "@/lib/env";
import { parseLocationAiConfig } from "@/lib/locations";
import type { BookingLanguage } from "@/lib/i18n";

export async function GET(req: NextRequest) {
  const expected = getCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Overlap guard: two concurrent ticks would otherwise select the same
  // reminderSentAt IS NULL rows and double-send. TTL bounds a crashed tick.
  const lock = await acquireCronLock("reminders", 3000);
  if (!lock.locked) {
    return NextResponse.json({ locked: true, skipped: true, sent: 0, checked: 0 });
  }

  try {
    return await runReminderTick();
  } finally {
    await lock.release();
  }
}

async function runReminderTick() {

  const now = new Date();
  const windowStart = addHours(now, 20);
  const windowEnd = addHours(now, 28);

  const upcoming = await db
    .select({
      id: bookings.id,
      clientName: bookings.clientName,
      clientEmail: bookings.clientEmail,
      clientPhone: bookings.clientPhone,
      startsAt: bookings.startsAt,
      businessId: bookings.businessId,
      serviceId: bookings.serviceId,
      staffId: bookings.staffId,
      locationId: bookings.locationId,
      clientId: bookings.clientId,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        gte(bookings.startsAt, windowStart),
        lt(bookings.startsAt, windowEnd),
        isNull(bookings.reminderSentAt),
      ),
    );

  if (upcoming.length === 0) {
    return NextResponse.json({ sent: 0, checked: 0 });
  }

  const bookingIds = upcoming.map((booking) => booking.id);
  const businessIds = [...new Set(upcoming.map((booking) => booking.businessId))];
  const serviceIds = [
    ...new Set(upcoming.map((booking) => booking.serviceId).filter((id): id is string => Boolean(id))),
  ];
  const staffIds = [
    ...new Set(upcoming.map((booking) => booking.staffId).filter((id): id is string => Boolean(id))),
  ];
  const locationIds = [
    ...new Set(
      upcoming
        .map((booking) => booking.locationId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [businessRows, serviceRows, staffRows, locationRows, alreadySentRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        plan: businesses.plan,
        language: businesses.language,
      })
      .from(businesses)
      .where(inArray(businesses.id, businessIds)),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(inArray(services.id, serviceIds)),
    db
      .select({ id: staff.id, name: staff.name })
      .from(staff)
      .where(inArray(staff.id, staffIds)),
    locationIds.length > 0
      ? db
          .select({ id: locations.id, aiConfig: locations.aiConfig })
          .from(locations)
          .where(inArray(locations.id, locationIds))
      : Promise.resolve([]),
    db
      .select({ bookingId: bookingNotifications.bookingId })
      .from(bookingNotifications)
      .where(
        and(
          inArray(bookingNotifications.bookingId, bookingIds),
          eq(bookingNotifications.type, "reminder_24h"),
          eq(bookingNotifications.status, "sent"),
        ),
      ),
  ]);

  const businessById = new Map(businessRows.map((row) => [row.id, row]));
  const serviceById = new Map(serviceRows.map((row) => [row.id, row]));
  const staffById = new Map(staffRows.map((row) => [row.id, row]));
  const locationById = new Map(locationRows.map((row) => [row.id, row]));
  const alreadySentBookingIds = new Set(alreadySentRows.map((row) => row.bookingId));

  let sent = 0;
  let skipped = 0;

  for (const booking of upcoming) {
    if (!booking.serviceId || !booking.staffId) {
      skipped++;
      continue;
    }

    const business = businessById.get(booking.businessId);
    const service = serviceById.get(booking.serviceId);
    const member = staffById.get(booking.staffId);

    if (!business || !service || !member) continue;

    if (canUseFeature(business.plan as Plan, "smartReminderSystem") && booking.locationId) {
      const location = locationById.get(booking.locationId);
      if (parseLocationAiConfig(location?.aiConfig).smartReminderSystem) {
        skipped++;
        continue;
      }
    }

    if (alreadySentBookingIds.has(booking.id)) {
      await db
        .update(bookings)
        .set({ reminderSentAt: new Date() })
        .where(and(eq(bookings.id, booking.id), isNull(bookings.reminderSentAt)));
      skipped++;
      continue;
    }

    try {
      const result = await sendBookingReminderMessage({
        businessId: booking.businessId,
        bookingId: booking.id,
        clientId: booking.clientId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        clientPhone: booking.clientPhone,
        businessName: business.name,
        serviceName: service.name,
        staffName: member.name,
        startsAt: new Date(booking.startsAt),
        manageUrl: buildClientBookingUrl({
          bookingId: booking.id,
          clientPhone: booking.clientPhone,
        }),
        plan: business.plan as Plan,
        language: business.language as BookingLanguage,
      });

      if (result.status === "sent" || result.status === "duplicate") {
        await db
          .update(bookings)
          .set({ reminderSentAt: new Date() })
          .where(and(eq(bookings.id, booking.id), isNull(bookings.reminderSentAt)));
        sent++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Reminder failed for booking ${booking.id}:`, error);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, checked: upcoming.length });
}
