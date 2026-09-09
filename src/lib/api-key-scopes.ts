export const API_KEY_SCOPES = [
  "bookings:read",
  "bookings:write",
  "desktop:read",
  "desktop:bookings",
  "desktop:write",
  "mobile:read",
  "mobile:bookings",
  "mobile:write",
  "voice:read",
  "voice:write",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function isApiKeyScope(value: string): value is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value);
}
