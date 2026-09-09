import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import {
  DEVELOPER_FULL_ACCESS_PLAN,
  isDeveloperFullAccessEmail,
} from "@/lib/developer-access-emails";

async function persistGrowthPlan(businessId: string): Promise<void> {
  await db
    .update(businesses)
    .set({
      plan: DEVELOPER_FULL_ACCESS_PLAN,
      planExpiresAt: null,
    })
    .where(eq(businesses.id, businessId));
}

/** Persist Growth (no expiry) when this login email is on the developer allowlist. */
export async function grantDeveloperFullAccess(input: {
  businessId: string;
  email: string;
}): Promise<boolean> {
  if (!isDeveloperFullAccessEmail(input.email)) return false;
  try {
    await persistGrowthPlan(input.businessId);
    return true;
  } catch {
    return false;
  }
}

/** Persist Growth when any user on the business is on the developer allowlist. */
export async function grantDeveloperFullAccessForBusiness(businessId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.businessId, businessId));

    const developer = rows.find((row) => isDeveloperFullAccessEmail(row.email));
    if (!developer) return false;

    await persistGrowthPlan(businessId);
    return true;
  } catch {
    return false;
  }
}
