import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, reviews } from "@/db/schema";
import { generateAiCopy } from "@/lib/ai/copy";

export async function generateReviewReplyForBusiness(
  businessId: string,
  reviewId: string,
): Promise<{ reply: string; source: string } | null> {
  const [review] = await db
    .select({
      clientName: reviews.clientName,
      rating: reviews.rating,
      comment: reviews.comment,
    })
    .from(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.businessId, businessId)))
    .limit(1);

  if (!review) return null;

  const [business] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const generated = await generateAiCopy({
    feature: "reviewReplies",
    businessName: business?.name ?? "Our business",
    clientName: review.clientName,
    extra: `Rating: ${review.rating}/5. Review: ${review.comment ?? "No written comment."}`,
  });

  return {
    reply: generated.body,
    source: generated.source,
  };
}
