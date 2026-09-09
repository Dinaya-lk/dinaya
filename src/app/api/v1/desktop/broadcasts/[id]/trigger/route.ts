import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { sendBroadcast } from "@/lib/broadcasts";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";

async function requireBroadcastAccess(businessId: string) {
  try {
    await requirePro(businessId, "broadcasts");
    return null;
  } catch (error) {
    if (error instanceof PlanRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-broadcast-trigger",
    limit: 12,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const accessError = await requireBroadcastAccess(businessId);
  if (accessError) return accessError;

  const [broadcast] = await db
    .select()
    .from(broadcasts)
    .where(and(eq(broadcasts.id, id), eq(broadcasts.businessId, businessId)))
    .limit(1);

  if (!broadcast) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const now = new Date();
  await db
    .update(broadcasts)
    .set({
      status: "sending",
      updatedAt: now,
    })
    .where(and(eq(broadcasts.id, id), eq(broadcasts.businessId, businessId)));

  try {
    const stats = await sendBroadcast({ ...broadcast, status: "sending" });
    const finalStatus = stats.sentCount > 0 ? "sent" : stats.failedCount > 0 ? "failed" : "sent";

    const [updated] = await db
      .update(broadcasts)
      .set({
        status: finalStatus,
        recipientCount: stats.recipientCount,
        sentCount: stats.sentCount,
        skippedCount: stats.skippedCount,
        failedCount: stats.failedCount,
        sentAt: now,
        updatedAt: now,
      })
      .where(and(eq(broadcasts.id, id), eq(broadcasts.businessId, businessId)))
      .returning({
        channel: broadcasts.channel,
        id: broadcasts.id,
        recipientCount: broadcasts.recipientCount,
        status: broadcasts.status,
      });

    return NextResponse.json({
      id: updated?.id ?? broadcast.id,
      status: updated?.status ?? finalStatus,
      recipientCount: updated?.recipientCount ?? stats.recipientCount,
      channel: updated?.channel ?? broadcast.channel,
      serverTime: now.toISOString(),
    });
  } catch {
    await db
      .update(broadcasts)
      .set({
        status: "failed",
        updatedAt: now,
      })
      .where(and(eq(broadcasts.id, id), eq(broadcasts.businessId, businessId)));

    return NextResponse.json({ error: "Unable to send broadcast." }, { status: 500 });
  }
}
