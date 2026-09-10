import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { requireDesktopRead, requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { locations, services, staff, staffLocations, staffServices } from "@/db/schema";
import {
  getStaffDashboardDetail,
  getStaffDashboardList,
  isDashboardStaffStatusFilter,
  type DashboardStaffStatusFilter,
} from "@/lib/dashboard/staff";
import { PlanLimitError, requirePlanLimit } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 150;

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
}

const staffCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  bio: z.string().trim().max(1000).optional().nullable(),
  serviceIds: z.array(z.uuid()).optional().default([]),
  locationIds: z.array(z.uuid()).optional().default([]),
});

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-staff",
    limit: 180,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  if (statusParam && !isDashboardStaffStatusFilter(statusParam)) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  try {
    const staff = await getStaffDashboardList(businessId, {
      limit: parseLimit(params.get("limit")),
      q: params.get("q")?.trim() ?? "",
      status: (statusParam || "all") as DashboardStaffStatusFilter,
    });

    return NextResponse.json({
      ...staff,
      serverTime: new Date().toISOString(),
      webUrl: "/dashboard/staff",
    });
  } catch (error) {
    console.error("[desktop-staff] Failed to load staff list.", { businessId, error });
    return NextResponse.json(
      { error: "Staff could not be loaded right now. Please refresh or open the web dashboard." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-staff-create",
    limit: 90,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const parsed = staffCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the staff details.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { name, bio } = parsed.data;
  const serviceIds = Array.from(new Set(parsed.data.serviceIds));
  const locationIds = Array.from(new Set(parsed.data.locationIds));

  const [{ value: staffCount }] = await db
    .select({ value: count() })
    .from(staff)
    .where(eq(staff.businessId, businessId));
  try {
    await requirePlanLimit(businessId, "staff", Number(staffCount));
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        { error: "Free businesses can add 1 staff member. Upgrade to Pro for more staff." },
        { status: 402 },
      );
    }
    throw error;
  }

  if (serviceIds.length > 0) {
    const validServices = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.businessId, businessId), inArray(services.id, serviceIds)));

    if (validServices.length !== serviceIds.length) {
      return NextResponse.json({ error: "One or more services are invalid." }, { status: 400 });
    }
  }

  if (locationIds.length > 0) {
    const validLocations = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.businessId, businessId), inArray(locations.id, locationIds)));

    if (validLocations.length !== locationIds.length) {
      return NextResponse.json({ error: "One or more locations are invalid." }, { status: 400 });
    }
  }

  const [created] = await db
    .insert(staff)
    .values({ businessId, name, bio: bio || null })
    .returning({ id: staff.id });

  if (serviceIds.length > 0) {
    await db.insert(staffServices).values(
      serviceIds.map((serviceId) => ({ staffId: created.id, serviceId })),
    );
  }

  if (locationIds.length > 0) {
    await db.insert(staffLocations).values(
      locationIds.map((locationId, index) => ({
        staffId: created.id,
        locationId,
        isPrimary: index === 0,
      })),
    );
  } else {
    const [defaultLoc] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.businessId, businessId), eq(locations.isDefault, true)))
      .limit(1);
    if (defaultLoc) {
      await db.insert(staffLocations).values({
        staffId: created.id,
        locationId: defaultLoc.id,
        isPrimary: true,
      });
    }
  }

  const detail = await getStaffDashboardDetail(businessId, created.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    serverTime: new Date().toISOString(),
    webUrl: `/dashboard/staff/${created.id}`,
  }, { status: 201 });
}
