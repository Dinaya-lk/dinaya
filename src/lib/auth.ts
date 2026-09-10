import { auth } from "@/auth";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { grantDeveloperFullAccess } from "@/lib/developer-access";
import {
  DEVELOPER_FULL_ACCESS_PLAN,
  isDeveloperFullAccessEmail,
} from "@/lib/developer-access-emails";
import { resolveEffectivePlan, type Plan } from "@/lib/plan";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const SIGN_IN_PATH = "/auth/signin";

export type BusinessContext = {
  business: {
    id: string;
    name: string;
    plan: Plan;
    planExpiresAt: Date | null;
    slug: string;
    language: string;
  };
  businessId: string;
  role: "owner" | "staff";
  user: {
    email?: string | null;
    id: string;
    name?: string | null;
  };
  readOnlyImpersonation?: boolean;
  impersonatedBy?: string;
};

export async function getBusinessContext(): Promise<BusinessContext | null> {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    return null;
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      businessId: users.businessId,
      role: users.role,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, sessionUserId))
    .limit(1);

  if (!dbUser) {
    return null;
  }

  const businessId = dbUser.businessId;
  const userId = dbUser.id;
  const role = dbUser.role;

  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      plan: businesses.plan,
      planExpiresAt: businesses.planExpiresAt,
      slug: businesses.slug,
      language: businesses.language,
      isSuspended: businesses.isSuspended,
      deletedAt: businesses.deletedAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business || business.isSuspended || business.deletedAt) {
    return null;
  }

  const developerAccess = isDeveloperFullAccessEmail(dbUser.email);
  if (developerAccess) {
    await grantDeveloperFullAccess({
      businessId,
      email: dbUser.email,
    });
  }

  const effectivePlan = developerAccess
    ? DEVELOPER_FULL_ACCESS_PLAN
    : resolveEffectivePlan({
        storedPlan: business.plan,
        planExpiresAt: business.planExpiresAt,
      });

  return {
    business: {
      id: business.id,
      name: business.name,
      plan: effectivePlan,
      planExpiresAt: developerAccess ? null : (business.planExpiresAt ?? null),
      slug: business.slug,
      language: business.language,
    },
    businessId,
    role,
    user: {
      email: dbUser.email,
      id: userId,
      name: dbUser.name,
    },
    readOnlyImpersonation: session.user.readOnlyImpersonation,
    impersonatedBy: session.user.impersonatedBy,
  };
}

export async function requireBusiness(): Promise<BusinessContext> {
  const context = await getBusinessContext();

  if (!context) {
    redirect(SIGN_IN_PATH);
  }

  return context;
}

export async function requireOwner(): Promise<BusinessContext> {
  const context = await requireBusiness();

  if (context.role !== "owner") {
    redirect("/dashboard");
  }

  return context;
}

/** Throws when a read-only impersonation session attempts a mutation. */
export function assertMutableSession(context: BusinessContext): void {
  if (context.readOnlyImpersonation) {
    throw new Error("Read-only impersonation session — mutations are blocked.");
  }
}

export async function requireMutableBusiness(): Promise<BusinessContext> {
  const context = await requireBusiness();
  assertMutableSession(context);
  return context;
}

export async function requireMutableOwner(): Promise<BusinessContext> {
  const context = await requireOwner();
  assertMutableSession(context);
  return context;
}

export function getSignInPath(): string {
  return SIGN_IN_PATH;
}
