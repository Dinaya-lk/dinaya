import { NextRequest, NextResponse } from "next/server";
import { requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { generateReviewReplyForBusiness } from "@/lib/dashboard/review-reply-ai";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-review-generate-reply",
    limit: 20,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  try {
    await requirePro(businessId, "reviewReplies");
  } catch (error) {
    if (error instanceof PlanRequiredError) {
      return NextResponse.json({ error: "AI review replies are available on Growth." }, { status: 402 });
    }
    throw error;
  }

  const generated = await generateReviewReplyForBusiness(businessId, id);
  if (!generated) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    reply: generated.reply,
    source: generated.source,
    serverTime: new Date().toISOString(),
  });
}
