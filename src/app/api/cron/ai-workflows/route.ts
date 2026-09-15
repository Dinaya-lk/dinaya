import { NextRequest, NextResponse } from "next/server";
import { runAiWorkflows } from "@/lib/ai/workflows";
import { acquireCronLock } from "@/lib/cron-lock";
import { getCronSecret } from "@/lib/env";

export async function GET(req: NextRequest) {
  const expected = getCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lock = await acquireCronLock("ai-workflows");
  if (!lock.locked) {
    return NextResponse.json({ locked: true, skipped: true });
  }

  try {
    const summary = await runAiWorkflows();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/ai-workflows] unhandled error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await lock.release();
  }
}
