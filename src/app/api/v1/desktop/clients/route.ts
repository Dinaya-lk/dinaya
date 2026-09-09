import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireDesktopRead, requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { clients } from "@/db/schema";
import {
  getClientDashboardDetail,
  getClientsDashboardList,
  isDashboardClientStageFilter,
  type DashboardClientStageFilter,
} from "@/lib/dashboard/clients";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 150;

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
}

const clientCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(30),
  email: z.email().optional().nullable().or(z.literal("")),
  stage: z.enum(["lead", "prospect", "active", "churned"]).optional(),
  source: z.string().trim().max(100).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).optional().nullable(),
  internalNotes: z.string().trim().max(5000).optional().nullable(),
});

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; cause?: { code?: string } };
  return maybe.code === "23505" || maybe.cause?.code === "23505";
}

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-clients",
    limit: 180,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const params = req.nextUrl.searchParams;
  const stageParam = params.get("stage");
  if (stageParam && !isDashboardClientStageFilter(stageParam)) {
    return NextResponse.json({ error: "stage is invalid." }, { status: 400 });
  }

  const clients = await getClientsDashboardList(businessId, {
    limit: parseLimit(params.get("limit")),
    q: params.get("q")?.trim() ?? "",
    stage: (stageParam || "all") as DashboardClientStageFilter,
  });

  return NextResponse.json({
    ...clients,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/clients",
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-client-create",
    limit: 90,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const parsed = clientCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the client details.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, stage, source, tags, internalNotes } = parsed.data;
  const phone = normalizeSriLankanPhone(parsed.data.phone);
  if (!phone || phone.length < 7) {
    return NextResponse.json(
      { error: "Please enter a valid Sri Lankan phone number.", fieldErrors: { phone: ["Invalid phone number."] } },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.businessId, businessId), eq(clients.phone, phone)))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "A client with this phone number already exists." },
      { status: 409 },
    );
  }

  let created: { id: string };
  try {
    const [row] = await db
      .insert(clients)
      .values({
        businessId,
        name,
        phone,
        email: email || null,
        stage: stage || "lead",
        source: source || null,
        tags: tags || null,
        internalNotes: internalNotes || null,
      })
      .returning({ id: clients.id });
    created = row;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A client with this phone number already exists." },
        { status: 409 },
      );
    }
    throw error;
  }

  const detail = await getClientDashboardDetail(businessId, created.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    serverTime: new Date().toISOString(),
    webUrl: `/dashboard/clients/${created.id}`,
  }, { status: 201 });
}
