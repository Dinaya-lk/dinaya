import { createHash } from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { platformAdminMembers } from "@/db/schema";
import {
  getPlatformAdminAllowlistEmails,
  isAllowlistedPlatformAdminEmail,
} from "@/lib/developer-access-emails";

export type PlatformAdminMember = {
  id: string;
  email: string;
  invitedBy: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  status: string;
  source: "database" | "env";
};

function getEnvAllowlist(): string[] {
  return getPlatformAdminAllowlistEmails();
}

export function isEnvPlatformAdmin(email?: string | null): boolean {
  return isAllowlistedPlatformAdminEmail(email);
}

export async function listPlatformAdminMembers(): Promise<PlatformAdminMember[]> {
  const envMembers = getEnvAllowlist().map((email) => ({
    id: `env:${email}`,
    email,
    invitedBy: null,
    invitedAt: new Date(0),
    acceptedAt: new Date(0),
    revokedAt: null,
    status: "active",
    source: "env" as const,
  }));

  try {
    const rows = await db
      .select()
      .from(platformAdminMembers)
      .where(or(eq(platformAdminMembers.status, "active"), isNull(platformAdminMembers.revokedAt)))
      .orderBy(desc(platformAdminMembers.invitedAt));

    const dbMembers = rows
      .filter((row) => row.status === "active" && !row.revokedAt)
      .map((row) => ({
        id: row.id,
        email: row.email,
        invitedBy: row.invitedBy,
        invitedAt: row.invitedAt,
        acceptedAt: row.acceptedAt,
        revokedAt: row.revokedAt,
        status: row.status,
        source: "database" as const,
      }));

    const merged = new Map<string, PlatformAdminMember>();
    for (const member of [...envMembers, ...dbMembers]) {
      merged.set(member.email.toLowerCase(), member);
    }
    return [...merged.values()].sort((a, b) => a.email.localeCompare(b.email));
  } catch {
    return envMembers;
  }
}

export async function isPlatformAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();

  if (isEnvPlatformAdmin(normalized)) return true;

  try {
    const [row] = await db
      .select({ id: platformAdminMembers.id })
      .from(platformAdminMembers)
      .where(and(
        eq(platformAdminMembers.email, normalized),
        eq(platformAdminMembers.status, "active"),
        isNull(platformAdminMembers.revokedAt),
      ))
      .limit(1);
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function invitePlatformAdminMember(input: {
  email: string;
  invitedBy: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (isEnvPlatformAdmin(email)) {
    return { ok: false, error: "This email is already on the env allowlist." };
  }

  try {
    const [existing] = await db
      .select({ id: platformAdminMembers.id, status: platformAdminMembers.status })
      .from(platformAdminMembers)
      .where(eq(platformAdminMembers.email, email))
      .limit(1);

    if (existing?.status === "active") {
      return { ok: false, error: "This admin is already active." };
    }

    if (existing) {
      await db
        .update(platformAdminMembers)
        .set({
          status: "active",
          invitedBy: input.invitedBy,
          invitedAt: new Date(),
          acceptedAt: new Date(),
          revokedAt: null,
        })
        .where(eq(platformAdminMembers.id, existing.id));
    } else {
      await db.insert(platformAdminMembers).values({
        email,
        invitedBy: input.invitedBy,
        acceptedAt: new Date(),
        status: "active",
      });
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not invite admin member." };
  }
}

export async function revokePlatformAdminMember(memberId: string): Promise<boolean> {
  if (memberId.startsWith("env:")) return false;

  const result = await db
    .update(platformAdminMembers)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(platformAdminMembers.id, memberId), eq(platformAdminMembers.status, "active")))
    .returning({ id: platformAdminMembers.id });

  return result.length > 0;
}

export function hashAdminAuditPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}
