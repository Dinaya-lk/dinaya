import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireDesktopRead, requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { locations } from "@/db/schema";
import {
  getLocationDashboardDetail,
  getLocationsDashboardList,
  isDashboardLocationStatusFilter,
  type DashboardLocationStatusFilter,
} from "@/lib/dashboard/locations";
import {
  countLocations,
  requireCanAddLocation,
  slugifyLocationName,
} from "@/lib/locations";
import { PlanLimitError } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 150;

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
}

const locationCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  address: z.string().trim().max(1000).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  timezone: z.string().trim().min(1).max(80).default("Asia/Colombo"),
  slug: z.string().trim().max(50).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-locations",
    limit: 180,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  if (statusParam && !isDashboardLocationStatusFilter(statusParam)) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  const locations = await getLocationsDashboardList(businessId, {
    limit: parseLimit(params.get("limit")),
    q: params.get("q")?.trim() ?? "",
    status: (statusParam || "all") as DashboardLocationStatusFilter,
  });

  return NextResponse.json({
    ...locations,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/locations",
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-location-create",
    limit: 90,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const parsed = locationCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the location details.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    await requireCanAddLocation(businessId);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        { error: "Your plan has reached the location limit. Upgrade to add more branches." },
        { status: 402 },
      );
    }
    throw error;
  }

  const { name, address, phone, timezone, isActive } = parsed.data;
  const existingCount = await countLocations(businessId);
  const baseSlug = parsed.data.slug?.trim() || slugifyLocationName(name) || "branch";
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const [conflict] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.businessId, businessId), eq(locations.slug, slug)))
      .limit(1);
    if (!conflict) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const [created] = await db
    .insert(locations)
    .values({
      businessId,
      name,
      slug,
      address: address || null,
      phone: phone || null,
      timezone,
      isActive,
      isDefault: existingCount === 0,
      sortOrder: existingCount,
    })
    .returning({ id: locations.id });

  const detail = await getLocationDashboardDetail(businessId, created.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/locations",
  }, { status: 201 });
}
