/** Founder emails with platform admin + Growth (`max`) for product testing. */
export const FOUNDER_FULL_ACCESS_EMAILS = ["suvenseoras@gmail.com"] as const;

/** Stored plan granted to founder / developer-access accounts. */
export const DEVELOPER_FULL_ACCESS_PLAN = "max" as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getDeveloperFullAccessEmails(): string[] {
  return [
    ...new Set([
      ...FOUNDER_FULL_ACCESS_EMAILS.map((email) => normalizeEmail(email)),
      ...parseEmailList(process.env.DEVELOPER_FULL_ACCESS_EMAILS),
    ]),
  ];
}

export function isDeveloperFullAccessEmail(email?: string | null): boolean {
  if (!email) return false;
  return getDeveloperFullAccessEmails().includes(normalizeEmail(email));
}

export function getPlatformAdminAllowlistEmails(): string[] {
  return [
    ...new Set([
      ...getDeveloperFullAccessEmails(),
      ...parseEmailList(process.env.PLATFORM_ADMIN_EMAILS),
    ]),
  ];
}

export function isAllowlistedPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getPlatformAdminAllowlistEmails().includes(normalizeEmail(email));
}
