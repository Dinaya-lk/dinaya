import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hasApiKeyAuth, requireApiKey } from "@/lib/api-key-auth";
import {
  businessInactiveMessage,
  getBusinessActiveStatus,
} from "@/lib/business-active";
import { grantDeveloperFullAccess } from "@/lib/developer-access";

export type ApiBusinessContext = {
  businessId: string;
  role: "owner" | "staff";
  user: {
    email?: string | null;
    id: string;
    name?: string | null;
  };
};

type ApiAuthResult =
  | { ok: true; context: ApiBusinessContext }
  | { ok: false; response: NextResponse };

export { hasApiKeyAuth };

async function rejectInactiveBusiness(businessId: string): Promise<NextResponse | null> {
  const status = await getBusinessActiveStatus(businessId);
  if (status === "active") return null;
  return NextResponse.json({ error: businessInactiveMessage(status) }, { status: 403 });
}

export async function requireApiBusiness({
  ownerOnly = false,
  req,
  apiKeyScope,
}: {
  ownerOnly?: boolean;
  req?: NextRequest;
  apiKeyScope?: string;
} = {}): Promise<ApiAuthResult> {
  if (req && apiKeyScope && hasApiKeyAuth(req)) {
    const keyResult = await requireApiKey(req, apiKeyScope);
    if (!keyResult.ok) return keyResult;

    const inactiveResponse = await rejectInactiveBusiness(keyResult.context.businessId);
    if (inactiveResponse) {
      return { ok: false, response: inactiveResponse };
    }

    return {
      ok: true,
      context: {
        businessId: keyResult.context.businessId,
        role: "owner",
        user: {
          id: `api-key:${keyResult.context.keyId}`,
          email: null,
          name: "API key",
        },
      },
    };
  }

  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
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
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const businessId = dbUser.businessId;
  const userId = dbUser.id;
  const role = dbUser.role;

  if (session?.user?.businessId && session.user.businessId !== businessId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (ownerOnly && role !== "owner") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (session?.user?.readOnlyImpersonation) {
    const method = req?.method?.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Read-only impersonation session — mutations are blocked." },
          { status: 403 },
        ),
      };
    }
  }

  const inactiveResponse = await rejectInactiveBusiness(businessId);
  if (inactiveResponse) {
    return { ok: false, response: inactiveResponse };
  }

  await grantDeveloperFullAccess({
    businessId,
    email: dbUser.email,
  });

  return {
    ok: true,
    context: {
      businessId,
      role,
      user: {
        email: dbUser.email,
        id: userId,
        name: dbUser.name,
      },
    },
  };
}
