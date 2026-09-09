import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, businesses, users } from "@/db/schema";
import { generateApiKey } from "@/lib/api-keys";
import type { DeviceClient } from "@/lib/device-client";
import { desktopNativeBookingsEnabled, mobileNativeBookingsEnabled } from "@/lib/desktop-native";

export const DESKTOP_DEVICE_SCOPES = ["desktop:read", "desktop:bookings", "desktop:write"];
export const MOBILE_DEVICE_SCOPES = ["mobile:read", "mobile:bookings", "mobile:write"];

export type DesktopAuthSession = {
  /** Legacy alias — always present so older clients keep working. Same value as `mobileKey` for mobile sessions. */
  desktopKey: string;
  /** Preferred field for Android clients. Same value as `desktopKey`. */
  mobileKey: string;
  auth: {
    deviceId: string;
    deviceName: string;
    keyId: string;
    keyType: "desktop" | "mobile";
  };
  business: {
    customDomain: string | null;
    id: string;
    name: string;
    plan: string;
    slug: string;
    timezone: string;
  };
  featureFlags: {
    desktopNativeBookings: boolean;
    mobileNativeBookings: boolean;
  };
  user: {
    email: string;
    id: string;
    name: string;
    role: string;
  };
};

export class DesktopAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DesktopAuthError";
    this.status = status;
  }
}

export async function createDesktopAuthSession(input: {
  deviceName: string;
  email: string;
  password: string;
  client?: DeviceClient;
}): Promise<DesktopAuthSession> {
  const email = input.email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new DesktopAuthError("Invalid email or password.", 401);
  }

  const [business] = await db
    .select({
      customDomain: businesses.customDomain,
      deletedAt: businesses.deletedAt,
      id: businesses.id,
      isSuspended: businesses.isSuspended,
      name: businesses.name,
      plan: businesses.plan,
      slug: businesses.slug,
      timezone: businesses.timezone,
    })
    .from(businesses)
    .where(eq(businesses.id, user.businessId))
    .limit(1);

  if (!business || business.isSuspended || business.deletedAt) {
    throw new DesktopAuthError("This business account is not active.", 403);
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    throw new DesktopAuthError("Invalid email or password.", 401);
  }

  const deviceId = randomUUID();
  const client: DeviceClient = input.client ?? "desktop";
  const isMobile = client === "mobile";
  const deviceName = input.deviceName.trim() || (isMobile ? "Dinaya Android" : "Dinaya Desktop");
  const { keyHash, rawKey } = generateApiKey();
  const [createdKey] = await db
    .insert(apiKeys)
    .values({
      businessId: business.id,
      deviceId,
      deviceName,
      keyHash,
      keyType: isMobile ? "mobile" : "desktop",
      name: `${isMobile ? "Mobile" : "Desktop"} - ${deviceName}`,
      scopes: isMobile ? [...MOBILE_DEVICE_SCOPES] : [...DESKTOP_DEVICE_SCOPES],
    })
    .returning({ id: apiKeys.id });

  return {
    auth: {
      deviceId,
      deviceName,
      keyId: createdKey.id,
      keyType: isMobile ? "mobile" : "desktop",
    },
    business: {
      customDomain: business.customDomain,
      id: business.id,
      name: business.name,
      plan: business.plan,
      slug: business.slug,
      timezone: business.timezone,
    },
    desktopKey: rawKey,
    mobileKey: rawKey,
    featureFlags: {
      desktopNativeBookings: desktopNativeBookingsEnabled(business.id),
      mobileNativeBookings: mobileNativeBookingsEnabled(business.id),
    },
    user: {
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    },
  };
}
