import { NextRequest, NextResponse } from "next/server";
import { processDueAutomationRuns } from "@/lib/automations/engine";
import { acquireCronLock } from "@/lib/cron-lock";
import { getCronSecret } from "@/lib/env";

export async function GET(req: NextRequest) {
  const expected = getCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lock = await acquireCronLock("automations");
  if (!lock.locked) {
    return NextResponse.json({ locked: true, skipped: true });
  }

  try {
    const result = await processDueAutomationRuns();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/automations] unhandled error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await lock.release();
  }
}
