import { addDays, addHours, subDays } from "date-fns";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import {
  availability,
  bookings,
  broadcasts,
  clients,
  deals,
  locations,
  reviews,
  services,
  staff,
  staffLocations,
  staffServices,
} from "@/db/schema";
import { grantDeveloperFullAccessForBusiness } from "@/lib/developer-access";
import { allocateServiceSlug } from "@/lib/service-slug";

export const FOUNDER_DEMO_NAME_PREFIX = "Demo ·";

export type FounderDemoSeedResult = {
  ok: true;
  created: {
    locations: number;
    staff: number;
    services: number;
    clients: number;
    bookings: number;
    reviews: number;
    deals: number;
    broadcasts: number;
  };
};

export type FounderDemoSeedDenied = {
  ok: false;
  error: string;
  status: 403;
};

function demoName(label: string): string {
  return `${FOUNDER_DEMO_NAME_PREFIX} ${label}`;
}

function existingByName<T extends { id: string; name: string }>(
  rows: T[],
  name: string,
): T | undefined {
  return rows.find((row) => row.name === name);
}

export async function seedFounderDemoCatalog(
  businessId: string,
): Promise<FounderDemoSeedResult | FounderDemoSeedDenied> {
  const allowed = await grantDeveloperFullAccessForBusiness(businessId);
  if (!allowed) {
    return {
      ok: false,
      error: "Demo data is only available on the founder testing account.",
      status: 403,
    };
  }

  const created = {
    locations: 0,
    staff: 0,
    services: 0,
    clients: 0,
    bookings: 0,
    reviews: 0,
    deals: 0,
    broadcasts: 0,
  };

  const [existingLocations, existingStaff, existingServices, existingClients] = await Promise.all([
    db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.businessId, businessId)),
    db
      .select({ id: staff.id, name: staff.name })
      .from(staff)
      .where(eq(staff.businessId, businessId)),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(eq(services.businessId, businessId)),
    db
      .select({ id: clients.id, name: clients.name, phone: clients.phone })
      .from(clients)
      .where(eq(clients.businessId, businessId)),
  ]);

  const locationName = demoName("Colombo Fort");
  let location = existingByName(existingLocations, locationName);
  if (!location) {
    const [row] = await db
      .insert(locations)
      .values({
        businessId,
        name: locationName,
        slug: "demo-colombo-fort",
        address: "42 Chatham Street, Colombo 01",
        phone: "+94112340000",
        timezone: "Asia/Colombo",
        isActive: true,
        isDefault: existingLocations.length === 0,
      })
      .returning({ id: locations.id, name: locations.name });
    location = row;
    created.locations += 1;
  }
  if (!location) {
    throw new Error("Could not create the demo location.");
  }

  const staffSpecs = [
    { name: demoName("Amal Perera"), bio: "Senior stylist — demo staff for feature testing." },
    { name: demoName("Dilini Fernando"), bio: "Colorist — demo staff for feature testing." },
  ];
  const staffRows: { id: string; name: string }[] = [];
  for (const spec of staffSpecs) {
    let row = existingByName(existingStaff, spec.name);
    if (!row) {
      const [inserted] = await db
        .insert(staff)
        .values({
          businessId,
          name: spec.name,
          bio: spec.bio,
          isActive: true,
        })
        .returning({ id: staff.id, name: staff.name });
      row = inserted;
      created.staff += 1;
    }
    if (!row) {
      throw new Error(`Could not create demo staff ${spec.name}.`);
    }
    staffRows.push(row);
    await db
      .insert(staffLocations)
      .values({ staffId: row.id, locationId: location.id, isPrimary: true })
      .onConflictDoNothing();
  }

  const serviceSpecs = [
    { name: demoName("Cut"), durationMinutes: 45, priceLkr: 2500 },
    { name: demoName("Color"), durationMinutes: 90, priceLkr: 6500 },
    { name: demoName("Blow-dry"), durationMinutes: 30, priceLkr: 1800 },
  ];
  const serviceRows: { id: string; name: string }[] = [];
  for (const spec of serviceSpecs) {
    let row = existingByName(existingServices, spec.name);
    if (!row) {
      const slug = await allocateServiceSlug(businessId, spec.name);
      const [inserted] = await db
        .insert(services)
        .values({
          businessId,
          name: spec.name,
          slug,
          description: "Sample service for founder mobile testing. Safe to edit or delete.",
          durationMinutes: spec.durationMinutes,
          priceLkr: spec.priceLkr,
          isActive: true,
        })
        .returning({ id: services.id, name: services.name });
      row = inserted;
      created.services += 1;
    }
    if (!row) {
      throw new Error(`Could not create demo service ${spec.name}.`);
    }
    serviceRows.push(row);
    for (const member of staffRows) {
      await db
        .insert(staffServices)
        .values({ staffId: member.id, serviceId: row.id })
        .onConflictDoNothing();
    }
  }

  for (const member of staffRows) {
    const existingWindows = await db
      .select({ id: availability.id })
      .from(availability)
      .where(eq(availability.staffId, member.id))
      .limit(1);
    if (existingWindows.length > 0) continue;
    await db.insert(availability).values(
      [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        staffId: member.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
      })),
    );
  }

  const clientSpecs = [
    { name: demoName("Nimali Jayasuriya"), phone: "+94770001001", stage: "active" as const },
    { name: demoName("Kasun Silva"), phone: "+94770001002", stage: "lead" as const },
    { name: demoName("Tharushi Perera"), phone: "+94770001003", stage: "prospect" as const },
    { name: demoName("Ruwan Fernando"), phone: "+94770001004", stage: "active" as const },
  ];
  const clientRows: { id: string; name: string; phone: string }[] = [];
  for (const spec of clientSpecs) {
    const existing = existingClients.find((row) => row.phone === spec.phone);
    if (existing) {
      clientRows.push(existing);
      continue;
    }
    const [inserted] = await db
      .insert(clients)
      .values({
        businessId,
        name: spec.name,
        phone: spec.phone,
        email: `${spec.phone.replace("+", "")}@demo.dinaya.lk`,
        stage: spec.stage,
        source: "demo",
        internalNotes: "Founder demo client — tap to edit, message, or book.",
      })
      .returning({ id: clients.id, name: clients.name, phone: clients.phone });
    clientRows.push(inserted);
    created.clients += 1;
  }

  const now = new Date();
  const cut = serviceRows[0];
  const color = serviceRows[1] ?? serviceRows[0];
  const blow = serviceRows[2] ?? serviceRows[0];
  const amal = staffRows[0];
  const dilini = staffRows[1] ?? staffRows[0];
  if (!cut || !color || !blow || !amal || !dilini) {
    throw new Error("Demo catalog is incomplete.");
  }
  const bookingSpecs = [
    {
      client: clientRows[0],
      service: cut,
      staff: amal,
      startsAt: addHours(now, 2),
      status: "confirmed" as const,
    },
    {
      client: clientRows[1],
      service: blow,
      staff: dilini,
      startsAt: addHours(now, 4),
      status: "pending" as const,
    },
    {
      client: clientRows[2],
      service: color,
      staff: amal,
      startsAt: addDays(now, 1),
      status: "confirmed" as const,
    },
    {
      client: clientRows[3],
      service: cut,
      staff: dilini,
      startsAt: subDays(now, 1),
      status: "completed" as const,
    },
    {
      client: clientRows[0],
      service: blow,
      staff: amal,
      startsAt: subDays(now, 2),
      status: "cancelled" as const,
    },
    {
      client: clientRows[1],
      service: cut,
      staff: dilini,
      startsAt: subDays(now, 3),
      status: "no_show" as const,
    },
  ];

  const existingDemoBookings = await db
    .select({
      id: bookings.id,
      clientPhone: bookings.clientPhone,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(eq(bookings.businessId, businessId), like(bookings.clientName, `${FOUNDER_DEMO_NAME_PREFIX}%`)),
    );

  for (const spec of bookingSpecs) {
    const already = existingDemoBookings.some(
      (row) => row.clientPhone === spec.client.phone && row.status === spec.status,
    );
    if (already) continue;
    const duration =
      spec.service === color ? 90 : spec.service === blow ? 30 : 45;
    await db.insert(bookings).values({
      businessId,
      serviceId: spec.service.id,
      staffId: spec.staff.id,
      locationId: location.id,
      clientId: spec.client.id,
      clientName: spec.client.name,
      clientPhone: spec.client.phone,
      clientEmail: `${spec.client.phone.replace("+", "")}@demo.dinaya.lk`,
      startsAt: spec.startsAt,
      endsAt: addHours(spec.startsAt, duration / 60),
      status: spec.status,
      source: "demo",
      notes: "Founder demo booking — confirm, complete, reschedule, or cancel.",
      cancellationReason: spec.status === "cancelled" ? "Demo cancel path" : null,
      cancelledAt: spec.status === "cancelled" ? now : null,
    });
    created.bookings += 1;
  }

  const existingReview = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(eq(reviews.businessId, businessId), eq(reviews.clientName, demoName("Nimali Jayasuriya"))),
    )
    .limit(1);
  if (existingReview.length === 0) {
    await db.insert(reviews).values({
      businessId,
      clientName: demoName("Nimali Jayasuriya"),
      rating: 5,
      comment: "Demo review — tap Reply to try the AI reply flow.",
      isPublished: true,
    });
    created.reviews += 1;
  }

  const existingDeal = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.businessId, businessId), eq(deals.serviceId, cut.id)))
    .limit(1);
  if (existingDeal.length === 0) {
    await db.insert(deals).values({
      businessId,
      locationId: location.id,
      serviceId: cut.id,
      staffId: amal.id,
      discountPercent: 20,
      slotsTotal: 8,
      dealWindowStart: now,
      dealWindowEnd: addDays(now, 14),
      apptWindowStart: now,
      apptWindowEnd: addDays(now, 21),
      status: "active",
    });
    created.deals += 1;
  }

  const existingBroadcast = await db
    .select({ id: broadcasts.id })
    .from(broadcasts)
    .where(
      and(eq(broadcasts.businessId, businessId), eq(broadcasts.name, demoName("Weekend reminder"))),
    )
    .limit(1);
  if (existingBroadcast.length === 0) {
    await db.insert(broadcasts).values({
      businessId,
      name: demoName("Weekend reminder"),
      channel: "whatsapp",
      body: "Demo broadcast — send a test from the Broadcasts screen.",
      audienceType: "all",
      status: "draft",
    });
    created.broadcasts += 1;
  }

  return { ok: true, created };
}
