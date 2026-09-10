import {NextResponse, NextRequest} from "next/server";
import { requireApiBusiness } from "@/lib/api-auth";
import { generateReviewReplyForBusiness } from "@/lib/dashboard/review-reply-ai";
import { PlanRequiredError, requirePro } from "@/lib/plan";

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const authResult = await requireApiBusiness({ req });
  if (!authResult.ok) return authResult.response;
  const { businessId } = authResult.context;
  const { id } = await params;

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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    reply: generated.reply,
    source: generated.source,
  });
}
