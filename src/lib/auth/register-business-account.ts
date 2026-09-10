import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  availability,
  businesses,
  locations,
  messageTemplates,
  services,
  staff,
  staffLocations,
  staffServices,
  users,
} from "@/db/schema";
import { normalizeReferralCode } from "@/lib/referrals";
import {
  DEVELOPER_FULL_ACCESS_PLAN,
  isDeveloperFullAccessEmail,
  normalizeEmail,
} from "@/lib/developer-access-emails";
import { TRIAL_LENGTH_DAYS } from "@/lib/plan";
import type { RegisterInput } from "@/lib/schemas/register";

type BusinessType = NonNullable<RegisterInput["businessType"]>;

const PRESET_SERVICES: Record<
  BusinessType,
  { name: string; durationMinutes: number; priceLkr: number; description: string }[]
> = {
  salon_barber: [
    { name: "Haircut", durationMinutes: 30, priceLkr: 1500, description: "Standard cut and styling." },
    { name: "Hair colouring consultation", durationMinutes: 45, priceLkr: 2500, description: "Consultation before colour work." },
    { name: "Beard trim", durationMinutes: 20, priceLkr: 800, description: "Shape and tidy beard service." },
  ],
  clinic: [
    { name: "Doctor consultation", durationMinutes: 20, priceLkr: 2500, description: "In-person consultation slot." },
    { name: "Follow-up visit", durationMinutes: 15, priceLkr: 1500, description: "Follow-up for existing patients." },
  ],
  tuition: [
    { name: "One-to-one class", durationMinutes: 60, priceLkr: 2500, description: "Individual learning session." },
    { name: "Group class", durationMinutes: 90, priceLkr: 1500, description: "Scheduled group class slot." },
  ],
  vehicle_service: [
    { name: "Vehicle inspection", durationMinutes: 30, priceLkr: 1000, description: "Initial inspection and estimate." },
    { name: "Full service appointment", durationMinutes: 120, priceLkr: 7500, description: "Workshop service booking." },
  ],
  photography: [
    { name: "Shoot consultation", durationMinutes: 30, priceLkr: 0, description: "Plan package, date, and location." },
    { name: "Portrait session", durationMinutes: 60, priceLkr: 12000, description: "Studio or outdoor portrait session." },
  ],
  consulting: [
    { name: "Discovery call", durationMinutes: 30, priceLkr: 0, description: "Understand the requirement before quoting." },
    { name: "Consultation", durationMinutes: 60, priceLkr: 5000, description: "Paid advisory session." },
  ],
  spa_wellness: [
    { name: "Massage therapy", durationMinutes: 60, priceLkr: 6500, description: "Relaxation or recovery session." },
    { name: "Facial treatment", durationMinutes: 45, priceLkr: 5500, description: "Skin care appointment." },
  ],
  other: [
    { name: "Consultation", durationMinutes: 30, priceLkr: 0, description: "Default appointment type." },
    { name: "Standard appointment", durationMinutes: 60, priceLkr: 2500, description: "General booking slot." },
  ],
};

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; cause?: { code?: string } };
  return maybe.code === "23505" || maybe.cause?.code === "23505";
}

export class RegisterAccountError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RegisterAccountError";
    this.status = status;
  }
}

export async function registerBusinessAccount(input: RegisterInput): Promise<{ businessId: string }> {
  const {
    name,
    businessName,
    slug,
    email,
    password,
    businessType,
    language,
    referrerCode,
    utmSource,
    utmMedium,
    utmCampaign,
  } = input;
  const selectedBusinessType = businessType ?? "other";
  const selectedLanguage = language ?? "en";
  const normalizedEmail = normalizeEmail(email);
  const developerAccess = isDeveloperFullAccessEmail(normalizedEmail);
  let referredByBusinessId: string | null = null;

  if (referrerCode) {
    const normalizedReferrer = normalizeReferralCode(referrerCode);
    const [referrer] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.referralCode, normalizedReferrer))
      .limit(1);
    referredByBusinessId = referrer?.id ?? null;
  }

  const [existingBusiness] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);

  if (existingBusiness) {
    throw new RegisterAccountError("That URL is already taken. Try a different one.", 409);
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (existingUser) {
    throw new RegisterAccountError("An account with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const businessId = randomUUID();
  const staffId = randomUUID();
  const locationId = randomUUID();
  const presetServices = PRESET_SERVICES[selectedBusinessType].map((preset) => ({
    id: randomUUID(),
    businessId,
    ...preset,
    requiresPayment: false,
    depositPercent: 0,
    beforeBuffer: 0,
    afterBuffer: 0,
    minimumNoticeHours: 2,
  }));

  try {
    await db.transaction(async (tx) => {
      await tx.insert(businesses).values({
        id: businessId,
        slug,
        name: businessName,
        email: normalizedEmail,
        businessType: selectedBusinessType,
        language: selectedLanguage,
        referralCode: slug,
        referredByBusinessId,
        signupUtmSource: utmSource || null,
        signupUtmMedium: utmMedium || null,
        signupUtmCampaign: utmCampaign || null,
        plan: developerAccess ? DEVELOPER_FULL_ACCESS_PLAN : "trial",
        planExpiresAt: developerAccess ? null : addDays(new Date(), TRIAL_LENGTH_DAYS),
        cancellationPolicy: "Please contact the business as early as possible if you need to cancel or reschedule.",
        depositPolicy: "Some services may require a deposit to reduce no-shows.",
      });
      await tx.insert(users).values({
        businessId,
        name,
        email: normalizedEmail,
        passwordHash,
        role: "owner",
      });
      await tx.insert(staff).values({
        id: staffId,
        businessId,
        name,
        bio: "Owner",
        isActive: true,
      });
      await tx.insert(services).values(presetServices);
      await tx.insert(staffServices).values(
        presetServices.map((service) => ({
          staffId,
          serviceId: service.id,
        })),
      );
      await tx.insert(availability).values(
        [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          staffId,
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
        })),
      );
      await tx.insert(locations).values({
        id: locationId,
        businessId,
        name: businessName,
        slug: "main",
        timezone: "Asia/Colombo",
        isDefault: true,
        isActive: true,
        sortOrder: 0,
      });
      await tx.insert(staffLocations).values({
        staffId,
        locationId,
        isPrimary: true,
      });
      await tx.insert(messageTemplates).values([
        {
          businessId,
          channel: "whatsapp",
          name: "Booking confirmation",
          body: "Hi {{clientName}}, your {{serviceName}} booking at {{businessName}} is confirmed for {{appointmentTime}}.",
          variables: ["clientName", "serviceName", "businessName", "appointmentTime"],
        },
        {
          businessId,
          channel: "whatsapp",
          name: "Appointment reminder",
          body: "Hi {{clientName}}, reminder: your {{serviceName}} booking at {{businessName}} is on {{appointmentTime}}.",
          variables: ["clientName", "serviceName", "businessName", "appointmentTime"],
        },
      ]);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new RegisterAccountError("That URL or email is already taken. Please try again.", 409);
    }
    throw error;
  }

  return { businessId };
}
