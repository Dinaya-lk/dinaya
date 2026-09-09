import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Plan = "trial" | "starter" | "pro" | "max" | "expired";
export type BillingInterval = "monthly" | "annual";
export type PaidPlan = "starter" | "pro" | "max";

/** Length of the free trial granted to every new business. */
export const TRIAL_LENGTH_DAYS = 14;

export type PlanFeature =
  | "aiBookingAutopilot"
  | "aiContentMachine"
  | "aiDealSuggestions"
  | "aiUpsellAssistant"
  | "aiVoiceReceptionist"
  | "automations"
  | "broadcasts"
  | "clientReactivationCampaign"
  | "deals"
  | "googleCalendarSync"
  | "intakeForms"
  | "payments"
  | "publicBookingPage"
  | "publicBookingPageCustomization"
  | "bookingPageTheme"
  | "reports"
  | "reviewEngine"
  | "reviews"
  | "reviewReplies"
  | "smartReminderSystem"
  | "vipLoyaltySequence"
  | "webhooks"
  | "whatsappSms";

export const AI_FEATURES: readonly PlanFeature[] = [
  "aiBookingAutopilot",
  "smartReminderSystem",
  "reviewEngine",
  "clientReactivationCampaign",
  "aiUpsellAssistant",
  "aiContentMachine",
  "vipLoyaltySequence",
  "aiDealSuggestions",
] as const;

export type Entitlements = {
  limits: {
    bookingsPerMonth: number | null;
    staff: number | null;
    services: number | null;
    locations: number | null;
    /** Included WhatsApp messages per month. 0 = channel off; null = unlimited. */
    whatsappMessagesPerMonth: number | null;
  };
  features: Record<PlanFeature, boolean>;
};
export type PlanLimit = keyof Entitlements["limits"];

export type PlanConfig = {
  starterMonthlyPriceLkr: number;
  starterAnnualPriceLkr: number;
  proMonthlyPriceLkr: number;
  proAnnualPriceLkr: number;
  maxMonthlyPriceLkr: number;
  maxAnnualPriceLkr: number;
  starterLaunched: boolean;
  proLaunched: boolean;
  maxLaunched: boolean;
  plans: Record<Plan, Entitlements>;
  updatedAt?: string;
  updatedBy?: string;
};

const PLAN_RANK: Record<Plan, number> = {
  expired: 0,
  trial: 0,
  starter: 1,
  pro: 2,
  max: 3,
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

// 14-day trial: Starter + Pro features, without Growth-only brand/domain,
// always-on AI, or future voice setup.
const DEFAULT_TRIAL_ENTITLEMENTS: Entitlements = {
  limits: {
    bookingsPerMonth: null,
    staff: 5,
    services: null,
    locations: 1,
    whatsappMessagesPerMonth: 200,
  },
  features: {
    aiBookingAutopilot: false,
    aiContentMachine: false,
    aiDealSuggestions: false,
    aiUpsellAssistant: false,
    aiVoiceReceptionist: false,
    automations: true,
    broadcasts: true,
    clientReactivationCampaign: false,
    deals: true,
    googleCalendarSync: true,
    intakeForms: true,
    payments: true,
    publicBookingPage: true,
    publicBookingPageCustomization: false,
    bookingPageTheme: false,
    reports: true,
    reviewEngine: false,
    reviews: true,
    reviewReplies: false,
    smartReminderSystem: false,
    vipLoyaltySequence: false,
    webhooks: true,
    whatsappSms: true,
  },
};

// Locked state after the trial lapses (or a chargeback): read-only, public
// booking page off, no new bookings until the business subscribes.
const DEFAULT_EXPIRED_ENTITLEMENTS: Entitlements = {
  limits: {
    bookingsPerMonth: 0,
    staff: 0,
    services: 0,
    locations: 0,
    whatsappMessagesPerMonth: 0,
  },
  features: {
    aiBookingAutopilot: false,
    aiContentMachine: false,
    aiDealSuggestions: false,
    aiUpsellAssistant: false,
    aiVoiceReceptionist: false,
    automations: false,
    broadcasts: false,
    clientReactivationCampaign: false,
    deals: false,
    googleCalendarSync: false,
    intakeForms: false,
    payments: false,
    publicBookingPage: false,
    publicBookingPageCustomization: false,
    bookingPageTheme: false,
    reports: false,
    reviewEngine: false,
    reviews: false,
    reviewReplies: false,
    smartReminderSystem: false,
    vipLoyaltySequence: false,
    webhooks: false,
    whatsappSms: false,
  },
};

const DEFAULT_STARTER_ENTITLEMENTS: Entitlements = {
  limits: {
    bookingsPerMonth: null,
    staff: 2,
    services: 10,
    locations: 1,
    whatsappMessagesPerMonth: 0,
  },
  features: {
    aiBookingAutopilot: false,
    aiContentMachine: false,
    aiDealSuggestions: false,
    aiUpsellAssistant: false,
    aiVoiceReceptionist: false,
    automations: false,
    broadcasts: false,
    clientReactivationCampaign: false,
    deals: false,
    googleCalendarSync: false,
    intakeForms: false,
    payments: true,
    publicBookingPage: true,
    publicBookingPageCustomization: false,
    bookingPageTheme: false,
    reports: false,
    reviewEngine: false,
    reviews: false,
    reviewReplies: false,
    smartReminderSystem: false,
    vipLoyaltySequence: false,
    webhooks: false,
    whatsappSms: false,
  },
};

const DEFAULT_PRO_ENTITLEMENTS: Entitlements = {
  limits: {
    bookingsPerMonth: null,
    staff: 5,
    services: null,
    locations: 1,
    whatsappMessagesPerMonth: 500,
  },
  features: {
    aiBookingAutopilot: false,
    aiContentMachine: false,
    aiDealSuggestions: false,
    aiUpsellAssistant: false,
    aiVoiceReceptionist: false,
    automations: true,
    broadcasts: true,
    clientReactivationCampaign: false,
    deals: true,
    googleCalendarSync: true,
    intakeForms: true,
    payments: true,
    publicBookingPage: true,
    publicBookingPageCustomization: false,
    bookingPageTheme: true,
    reports: true,
    reviewEngine: false,
    reviews: true,
    reviewReplies: false,
    smartReminderSystem: false,
    vipLoyaltySequence: false,
    webhooks: true,
    whatsappSms: true,
  },
};

const DEFAULT_MAX_ENTITLEMENTS: Entitlements = {
  limits: {
    bookingsPerMonth: null,
    staff: 15,
    services: null,
    locations: 3,
    whatsappMessagesPerMonth: 2000,
  },
  features: {
    aiBookingAutopilot: true,
    aiContentMachine: true,
    aiDealSuggestions: true,
    aiUpsellAssistant: true,
    aiVoiceReceptionist: false,
    automations: true,
    broadcasts: true,
    clientReactivationCampaign: true,
    deals: true,
    googleCalendarSync: true,
    intakeForms: true,
    payments: true,
    publicBookingPage: true,
    publicBookingPageCustomization: true,
    bookingPageTheme: true,
    reports: true,
    reviewEngine: true,
    reviews: true,
    reviewReplies: true,
    smartReminderSystem: true,
    vipLoyaltySequence: true,
    webhooks: true,
    whatsappSms: true,
  },
};

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  starterMonthlyPriceLkr: 2000,
  starterAnnualPriceLkr: 22000,
  proMonthlyPriceLkr: 4000,
  proAnnualPriceLkr: 44000,
  maxMonthlyPriceLkr: 7000,
  maxAnnualPriceLkr: 77000,
  starterLaunched: true,
  proLaunched: true,
  maxLaunched: true,
  plans: {
    trial: DEFAULT_TRIAL_ENTITLEMENTS,
    starter: DEFAULT_STARTER_ENTITLEMENTS,
    pro: DEFAULT_PRO_ENTITLEMENTS,
    max: DEFAULT_MAX_ENTITLEMENTS,
    expired: DEFAULT_EXPIRED_ENTITLEMENTS,
  },
};

export const ENFORCED_FEATURES: readonly PlanFeature[] = [
  ...AI_FEATURES,
  "aiVoiceReceptionist",
  "automations",
  "googleCalendarSync",
  "intakeForms",
  "payments",
  "publicBookingPageCustomization",
  "webhooks",
] as const;

// ─── Config loader ────────────────────────────────────────────────────────────

const CONFIG_DIR = path.join(process.cwd(), ".dinaya");
const CONFIG_FILE = path.join(CONFIG_DIR, "plans.json");

let cached: PlanConfig | null = null;

// `null` is a meaningful limit value ("unlimited"), so only fall back to the
// default when the saved value is actually missing (undefined). Using `??`
// would discard an admin's intentional "unlimited" for any limit whose default
// is a number (e.g. trial/pro locations) and silently revert it.
function pickLimit(
  value: number | null | undefined,
  fallback: number | null
): number | null {
  return value !== undefined ? value : fallback;
}

function mergeEntitlements(
  defaults: Entitlements,
  fromDisk: Partial<Entitlements> | undefined
): Entitlements {
  return {
    limits: {
      bookingsPerMonth: pickLimit(
        fromDisk?.limits?.bookingsPerMonth,
        defaults.limits.bookingsPerMonth
      ),
      staff: pickLimit(fromDisk?.limits?.staff, defaults.limits.staff),
      services: pickLimit(fromDisk?.limits?.services, defaults.limits.services),
      locations: pickLimit(fromDisk?.limits?.locations, defaults.limits.locations),
      whatsappMessagesPerMonth: pickLimit(
        fromDisk?.limits?.whatsappMessagesPerMonth,
        defaults.limits.whatsappMessagesPerMonth
      ),
    },
    features: {
      ...defaults.features,
      ...fromDisk?.features,
    },
  };
}

function isLegacySavedPlanConfig(fromDisk: Partial<PlanConfig>): boolean {
  return (
    !fromDisk.plans?.starter ||
    fromDisk.starterMonthlyPriceLkr === undefined ||
    fromDisk.starterAnnualPriceLkr === undefined
  );
}

export function mergePlanConfig(fromDisk: Partial<PlanConfig>): PlanConfig {
  const source: Partial<PlanConfig> = isLegacySavedPlanConfig(fromDisk)
    ? { updatedAt: fromDisk.updatedAt, updatedBy: fromDisk.updatedBy }
    : fromDisk;

  return {
    starterMonthlyPriceLkr:
      source.starterMonthlyPriceLkr ?? DEFAULT_PLAN_CONFIG.starterMonthlyPriceLkr,
    starterAnnualPriceLkr:
      source.starterAnnualPriceLkr ?? DEFAULT_PLAN_CONFIG.starterAnnualPriceLkr,
    proMonthlyPriceLkr:
      source.proMonthlyPriceLkr ?? DEFAULT_PLAN_CONFIG.proMonthlyPriceLkr,
    proAnnualPriceLkr:
      source.proAnnualPriceLkr ?? DEFAULT_PLAN_CONFIG.proAnnualPriceLkr,
    maxMonthlyPriceLkr:
      source.maxMonthlyPriceLkr ?? DEFAULT_PLAN_CONFIG.maxMonthlyPriceLkr,
    maxAnnualPriceLkr:
      source.maxAnnualPriceLkr ?? DEFAULT_PLAN_CONFIG.maxAnnualPriceLkr,
    starterLaunched: source.starterLaunched ?? DEFAULT_PLAN_CONFIG.starterLaunched,
    proLaunched: source.proLaunched ?? DEFAULT_PLAN_CONFIG.proLaunched,
    maxLaunched: source.maxLaunched ?? DEFAULT_PLAN_CONFIG.maxLaunched,
    plans: {
      trial: mergeEntitlements(
        DEFAULT_TRIAL_ENTITLEMENTS,
        source.plans?.trial
      ),
      starter: mergeEntitlements(
        DEFAULT_STARTER_ENTITLEMENTS,
        source.plans?.starter
      ),
      pro: mergeEntitlements(DEFAULT_PRO_ENTITLEMENTS, source.plans?.pro),
      max: mergeEntitlements(DEFAULT_MAX_ENTITLEMENTS, source.plans?.max),
      expired: mergeEntitlements(
        DEFAULT_EXPIRED_ENTITLEMENTS,
        source.plans?.expired
      ),
    },
    updatedAt: source.updatedAt,
    updatedBy: source.updatedBy,
  };
}

function loadFromDisk(): PlanConfig | null {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PlanConfig>;
    if (!parsed.plans?.starter || !parsed.plans?.pro || !parsed.plans?.max) return null;
    return mergePlanConfig(parsed);
  } catch {
    return null;
  }
}

export function getPlanConfig(): PlanConfig {
  if (cached) return cached;
  cached = loadFromDisk() ?? DEFAULT_PLAN_CONFIG;
  return cached;
}

export function invalidatePlanConfigCache(): void {
  cached = null;
}

export function savePlanConfig(next: PlanConfig): void {
  cached = next;
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // Vercel filesystem is read-only; DB persistence via savePlanConfigAsync is the source of truth
  }
  void import("@/lib/platform-settings").then(({ setPlatformSetting }) =>
    setPlatformSetting("plan_config", next, next.updatedBy).catch(() => undefined),
  );
}

export async function getPlanConfigAsync(): Promise<PlanConfig> {
  try {
    const { getPlatformSetting } = await import("@/lib/platform-settings");
    const fromDb = await getPlatformSetting<Partial<PlanConfig>>("plan_config");
    if (fromDb?.plans?.starter && fromDb?.plans?.pro && fromDb?.plans?.max) {
      cached = mergePlanConfig(fromDb);
      return cached;
    }
  } catch {
    // fall through
  }
  return getPlanConfig();
}

export async function savePlanConfigAsync(next: PlanConfig): Promise<void> {
  savePlanConfig(next);
  const { setPlatformSetting } = await import("@/lib/platform-settings");
  await setPlatformSetting("plan_config", next, next.updatedBy);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function planRank(plan: Plan): number {
  return PLAN_RANK[plan];
}


export function getSubscriptionPrice(
  plan: PaidPlan,
  interval: BillingInterval,
  config: PlanConfig = getPlanConfig()
): number {
  if (interval === "annual") {
    if (plan === "starter") return config.starterAnnualPriceLkr;
    return plan === "pro" ? config.proAnnualPriceLkr : config.maxAnnualPriceLkr;
  }
  if (plan === "starter") return config.starterMonthlyPriceLkr;
  return plan === "pro" ? config.proMonthlyPriceLkr : config.maxMonthlyPriceLkr;
}

export function payhereRecurrence(interval: BillingInterval): string {
  return interval === "annual" ? "1 Year" : "1 Month";
}

export function subscriptionItemName(plan: PaidPlan, interval: BillingInterval): string {
  const tier = plan === "max" ? "Growth" : plan === "pro" ? "Pro" : "Starter";
  const cadence = interval === "annual" ? "annual" : "monthly";
  return `Dinaya ${tier} — ${cadence} subscription`;
}

export function annualSavingsPercent(monthlyLkr: number, annualLkr: number): number {
  const fullYear = monthlyLkr * 12;
  if (fullYear <= 0) return 0;
  return Math.max(0, Math.round(((fullYear - annualLkr) / fullYear) * 100));
}

export function planDisplayName(plan: Plan): string {
  if (plan === "max") return "Growth";
  if (plan === "pro") return "Pro";
  if (plan === "starter") return "Starter";
  if (plan === "trial") return "Free trial";
  return "Expired";
}

export function isPaidPlan(plan: Plan): boolean {
  return plan === "starter" || plan === "pro" || plan === "max";
}

export function isPaidPlanAvailable(plan: PaidPlan, config: PlanConfig = getPlanConfig()): boolean {
  if (plan === "starter") return config.starterLaunched;
  return plan === "pro" ? config.proLaunched : config.maxLaunched;
}

/** Effective plan after expiry — trial/paid plans lock to "expired" once planExpiresAt is past. */
export function resolveEffectivePlan(input: {
  storedPlan: Plan | "free" | null | undefined;
  planExpiresAt: Date | null | undefined;
  now?: Date;
}): Plan {
  const now = input.now ?? new Date();
  // Legacy "free" rows (pre-trial model) collapse to the locked state.
  const stored = (input.storedPlan ?? "expired") as Plan | "free";

  if (stored === "expired" || stored === "free") return "expired";
  if (input.planExpiresAt && input.planExpiresAt < now) return "expired";
  return stored;
}

const MAX_ONLY_FEATURES: readonly PlanFeature[] = [
  ...AI_FEATURES,
  "aiVoiceReceptionist",
  "publicBookingPageCustomization",
  "reviewReplies",
];

const STARTER_FEATURES: readonly PlanFeature[] = [
  "payments",
  "publicBookingPage",
];

export function minimumPlanForFeature(feature: PlanFeature): Plan {
  if (MAX_ONLY_FEATURES.includes(feature)) return "max";
  if (STARTER_FEATURES.includes(feature)) return "starter";
  return "pro";
}

export function getEntitlements(plan: Plan): Entitlements {
  return getPlanConfig().plans[plan];
}

/** Max inherits Pro operational entitlements at runtime. */
export function getEffectiveEntitlements(
  plan: Plan,
  config: PlanConfig = getPlanConfig()
): Entitlements {
  if (plan === "max") {
    return {
      limits: config.plans.max.limits,
      features: {
        ...config.plans.pro.features,
        ...config.plans.max.features,
      },
    };
  }
  return config.plans[plan];
}

export function canUseFeature(
  plan: Plan,
  feature: PlanFeature,
  config: PlanConfig = getPlanConfig()
): boolean {
  return getEffectiveEntitlements(plan, config).features[feature];
}

export const TRIAL_ENTITLEMENTS = DEFAULT_TRIAL_ENTITLEMENTS;
export const STARTER_ENTITLEMENTS = DEFAULT_STARTER_ENTITLEMENTS;
export const EXPIRED_ENTITLEMENTS = DEFAULT_EXPIRED_ENTITLEMENTS;
export const PRO_ENTITLEMENTS = DEFAULT_PRO_ENTITLEMENTS;
export const MAX_ENTITLEMENTS = DEFAULT_MAX_ENTITLEMENTS;
export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  trial: DEFAULT_TRIAL_ENTITLEMENTS,
  starter: DEFAULT_STARTER_ENTITLEMENTS,
  pro: DEFAULT_PRO_ENTITLEMENTS,
  max: DEFAULT_MAX_ENTITLEMENTS,
  expired: DEFAULT_EXPIRED_ENTITLEMENTS,
};

const FEATURE_LABELS: Record<PlanFeature, string> = {
  aiBookingAutopilot: "AI Booking Autopilot",
  aiContentMachine: "30-Day AI Content Machine",
  aiDealSuggestions: "Smart deal suggestions",
  aiUpsellAssistant: "AI upsell assistant",
  aiVoiceReceptionist: "AI Voice Receptionist",
  automations: "Automations",
  broadcasts: "Broadcasts",
  deals: "Dinaya Deals",
  clientReactivationCampaign: "Client Reactivation Campaign",
  googleCalendarSync: "Google Calendar sync",
  intakeForms: "Intake & routing forms",
  payments: "PayHere payments",
  publicBookingPage: "Public booking page",
  publicBookingPageCustomization: "Booking page customization",
  bookingPageTheme: "Booking page colors & hero",
  reports: "Reports",
  reviewEngine: "Review engine",
  reviews: "Reviews",
  reviewReplies: "Review replies",
  smartReminderSystem: "Smart reminder system",
  vipLoyaltySequence: "VIP Loyalty Sequence",
  webhooks: "Webhooks and API",
  whatsappSms: "WhatsApp and SMS reminders",
};

export function planFeatureLabel(feature: PlanFeature): string {
  return FEATURE_LABELS[feature];
}

export class PlanRequiredError extends Error {
  constructor(
    public readonly businessId: string,
    public readonly feature: PlanFeature = "reports",
    public readonly requiredPlan: Plan = "pro"
  ) {
    super(
      `${FEATURE_LABELS[feature]} requires the ${planDisplayName(requiredPlan)} plan.`
    );
    this.name = "PlanRequiredError";
  }
}

const LIMIT_LABELS: Record<PlanLimit, string> = {
  bookingsPerMonth: "monthly bookings",
  staff: "staff members",
  services: "services",
  locations: "locations",
  whatsappMessagesPerMonth: "monthly WhatsApp messages",
};

export class PlanLimitError extends Error {
  constructor(
    public readonly limit: PlanLimit,
    public readonly max: number
  ) {
    super(`Your current plan allows up to ${max} ${LIMIT_LABELS[limit]}.`);
    this.name = "PlanLimitError";
  }
}

export async function getBusinessPlan(businessId: string): Promise<Plan> {
  const [
    { db },
    { businesses },
    { eq },
    { grantDeveloperFullAccessForBusiness },
  ] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("drizzle-orm"),
    import("@/lib/developer-access"),
  ]);

  if (await grantDeveloperFullAccessForBusiness(businessId)) {
    return "max";
  }

  const [business] = await db
    .select({
      plan: businesses.plan,
      planExpiresAt: businesses.planExpiresAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return resolveEffectivePlan({
    storedPlan: (business?.plan as Plan | undefined) ?? "expired",
    planExpiresAt: business?.planExpiresAt,
  });
}

export async function requirePro(
  businessId: string,
  feature: PlanFeature = "reports"
): Promise<void> {
  const [plan, config] = await Promise.all([
    getBusinessPlan(businessId),
    getPlanConfigAsync(),
  ]);
  const requiredPlan = minimumPlanForFeature(feature);

  if (!canUseFeature(plan, feature, config)) {
    throw new PlanRequiredError(businessId, feature, requiredPlan);
  }
}

export async function requirePlanLimit(
  businessId: string,
  limit: PlanLimit,
  currentCount: number
): Promise<void> {
  const [plan, config] = await Promise.all([
    getBusinessPlan(businessId),
    getPlanConfigAsync(),
  ]);
  const max = getEffectiveEntitlements(plan, config).limits[limit];

  if (max !== null && currentCount >= max) {
    throw new PlanLimitError(limit, max);
  }
}
