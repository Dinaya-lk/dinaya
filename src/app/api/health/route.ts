import { NextRequest, NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/platform-health";
import { requireHealthAuth } from "@/lib/health-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = requireHealthAuth(req);
  if (authError) return authError;
  const startedAt = Date.now();

  const db = await checkDatabaseHealth();
  const dbOk = db.status === "up";

  const body = {
    status: dbOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      db: {
        ok: dbOk,
        latencyMs: db.latencyMs,
        error: db.error ?? null,
      },
    },
    responseTimeMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
