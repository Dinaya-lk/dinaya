import { NextRequest, NextResponse } from "next/server";
import { checkEmailHealth } from "@/lib/platform-health";
import { requireHealthAuth } from "@/lib/health-auth";

/** Node runtime: checkEmailHealth shares `@/lib/platform-health` with the DB probe, which imports `node:dns`. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = requireHealthAuth(req);
  if (authError) return authError;
  const startedAt = Date.now();

  const check = await checkEmailHealth();
  const ok = check.status === "up";
  const domainCount =
    typeof check.details?.domainCount === "number" ? check.details.domainCount : null;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "email",
      provider: check.provider ?? "resend",
      domainCount,
      error: check.error ?? null,
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
