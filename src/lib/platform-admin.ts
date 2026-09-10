import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { isAllowlistedPlatformAdminEmail } from "@/lib/developer-access-emails";
import { isPlatformAdmin as isPlatformAdminAsync } from "@/lib/platform-admin-members";

export type PlatformAdminContext = {
  email: string;
  userId: string;
  name?: string | null;
};

type AuthSession = Session | null;

/** @deprecated Use async isPlatformAdmin from platform-admin-members */
export function isPlatformAdmin(email?: string | null): boolean {
  return isAllowlistedPlatformAdminEmail(email);
}

async function resolvePlatformAdminContext(session: AuthSession): Promise<PlatformAdminContext | null> {
  const email = session?.user?.email;
  const userId = session?.user?.id;
  if (!email || !userId) return null;
  if (!(await isPlatformAdminAsync(email))) return null;
  return { email, userId, name: session.user.name };
}

export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  return resolvePlatformAdminContext(await auth());
}

export async function requirePlatformAdminFromSession(
  session: AuthSession,
): Promise<PlatformAdminContext> {
  const ctx = await resolvePlatformAdminContext(session);
  if (!ctx) {
    redirect("/auth/signin?callbackUrl=/admin");
  }
  return ctx;
}

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  return requirePlatformAdminFromSession(await auth());
}
