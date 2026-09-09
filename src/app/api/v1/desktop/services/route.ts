import { NextRequest, NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { requireDesktopRead, requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { services } from "@/db/schema";
import {
  getServiceDashboardDetail,
  getServicesDashboardList,
  isDashboardServiceStatusFilter,
  type DashboardServiceStatusFilter,
} from "@/lib/dashboard/services";
import { PlanLimitError, requirePlanLimit } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";
import { serviceCreateSchema } from "@/lib/schemas/services";
import { allocateServiceSlug } from "@/lib/service-slug";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 150;

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
}

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-services",
    limit: 180,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  if (statusParam && !isDashboardServiceStatusFilter(statusParam)) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  const services = await getServicesDashboardList(businessId, {
    limit: parseLimit(params.get("limit")),
    q: params.get("q")?.trim() ?? "",
    status: (statusParam || "all") as DashboardServiceStatusFilter,
  });

  return NextResponse.json({
    ...services,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/services",
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-service-create",
    limit: 90,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const parsed = serviceCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const durationError = fieldErrors.durationMinutes
      ? "durationMinutes is required and must be at least 5 minutes."
      : "Please check the service details.";
    return NextResponse.json(
      { error: durationError, fieldErrors },
      { status: 400 },
    );
  }

  const [{ value: serviceCount }] = await db
    .select({ value: count() })
    .from(services)
    .where(eq(services.businessId, businessId));

  try {
    await requirePlanLimit(businessId, "services", Number(serviceCount));
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        { error: "Free businesses can publish up to 5 services. Upgrade to Pro for unlimited services." },
        { status: 402 },
      );
    }
    throw error;
  }

  const data = parsed.data;
  const slug = await allocateServiceSlug(businessId, data.name);
  const [service] = await db
    .insert(services)
    .values({
      businessId,
      slug,
      name: data.name,
      description: data.description,
      durationMinutes: data.durationMinutes,
      priceLkr: data.priceLkr ?? 0,
      requiresPayment: !!data.requiresPayment,
      depositPercent: data.depositPercent ?? 0,
      beforeBuffer: data.beforeBuffer ?? 0,
      afterBuffer: data.afterBuffer ?? 0,
      minimumNoticeHours: data.minimumNoticeHours ?? 0,
      dailyCapacity: data.dailyCapacity ?? null,
      maximumAdvanceDays: data.maximumAdvanceDays ?? null,
      intakeQuestions: data.intakeQuestions ?? null,
      priceVariants: data.priceVariants ?? null,
      successRedirectUrl: data.successRedirectUrl ?? null,
    })
    .returning({ id: services.id });

  const detail = await getServiceDashboardDetail(businessId, service.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    serverTime: new Date().toISOString(),
    webUrl: `/dashboard/services/${service.id}`,
  }, { status: 201 });
}
