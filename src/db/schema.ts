import {
  pgTable,
  pgEnum,
  text,
  varchar,
  boolean,
  integer,
  index,
  timestamp,
  jsonb,
  numeric,
  primaryKey,
  uuid,
  time,
  date,
  smallint,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["free", "pro", "max", "trial", "expired", "starter"]);
export const clientStageEnum = pgEnum("client_stage", [
  "lead",
  "prospect",
  "active",
  "churned",
]);
export const roleEnum = pgEnum("role", ["owner", "staff"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "refunded",
]);
export const dealStatusEnum = pgEnum("deal_status", [
  "active",
  "expired",
  "cancelled",
  "sold_out",
]);
export const dealSuggestionStatusEnum = pgEnum("deal_suggestion_status", [
  "pending",
  "accepted",
  "dismissed",
  "expired",
]);

// ─── Clients (CRM) ────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  stage: clientStageEnum("stage").default("lead").notNull(),
  source: varchar("source", { length: 100 }),
  tags: text("tags").array(),
  internalNotes: text("internal_notes"),
  communicationOptOut: boolean("communication_opt_out").default(false).notNull(),
  lastAiContactAt: timestamp("last_ai_contact_at"),
  loyaltyTier: varchar("loyalty_tier", { length: 40 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    businessPhoneUnique: uniqueIndex("clients_business_id_phone_unique").on(
      table.businessId,
      table.phone
    ),
    businessCreatedAtIdx: index("clients_business_created_at_idx").on(
      table.businessId,
      table.createdAt,
    ),
  };
});

export const clientNotes = pgTable("client_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Businesses ───────────────────────────────────────────────────────────────

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  timezone: text("timezone").default("Asia/Colombo").notNull(),
  language: varchar("language", { length: 5 }).default("en").notNull(),
  businessType: varchar("business_type", { length: 80 }),
  cancellationPolicy: text("cancellation_policy"),
  depositPolicy: text("deposit_policy"),
  bankTransferInstructions: text("bank_transfer_instructions"),
  lankaqrImageUrl: text("lankaqr_image_url"),
  // Social / profile links shown on the booking page
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  websiteUrl: text("website_url"),
  // Portfolio gallery — array of image URLs shown on the booking page
  galleryImages: text("gallery_images").array(),
  // Service router: a first-step booking question that maps each answer to a
  // service. Pro+ feature. null/disabled = normal service list.
  bookingRouter: jsonb("booking_router").$type<import("@/lib/booking-router").BookingRouter>(),
  plan: planEnum("plan").default("trial").notNull(),
  planExpiresAt: timestamp("plan_expires_at"),
  customDomain: varchar("custom_domain", { length: 255 }),
  customDomainVerified: boolean("custom_domain_verified").default(false).notNull(),
  customDomainVerificationToken: varchar("custom_domain_verification_token", { length: 64 }),
  customDomainStatus: varchar("custom_domain_status", { length: 40 }).default("none").notNull(),
  customDomainLastCheckedAt: timestamp("custom_domain_last_checked_at"),
  customDomainError: text("custom_domain_error"),
  customDomainConfig: jsonb("custom_domain_config"),
  customDomainVerification: jsonb("custom_domain_verification"),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  payhereEnabled: boolean("payhere_enabled").default(false).notNull(),
  payhereMerchantId: varchar("payhere_merchant_id", { length: 100 }),
  payhereMerchantSecret: text("payhere_merchant_secret"),
  paypalEnabled: boolean("paypal_enabled").default(false).notNull(),
  paypalClientId: varchar("paypal_client_id", { length: 200 }),
  paypalClientSecret: text("paypal_client_secret"),
  hideDinayaBranding: boolean("hide_dinaya_branding").default(false).notNull(),
  // Hex accent for public booking page theming (e.g. #2563eb). Pro+ customization.
  accentColor: varchar("accent_color", { length: 7 }),
  bookingPageBackground: varchar("booking_page_background", { length: 20 }).default("white").notNull(),
  bookingPageBackgroundColor: varchar("booking_page_background_color", { length: 7 }),
  bookingHeroOverlay: varchar("booking_hero_overlay", { length: 20 }).default("light").notNull(),
  bookingHeroOverlayOpacity: integer("booking_hero_overlay_opacity").default(60).notNull(),
  bookingThemePreset: varchar("booking_theme_preset", { length: 40 }),
  bookingPanelBackground: varchar("booking_panel_background", { length: 20 }).default("white").notNull(),
  directoryListed: boolean("directory_listed").default(false).notNull(),
  directoryCity: varchar("directory_city", { length: 80 }),
  directoryDistrict: varchar("directory_district", { length: 80 }),
  directoryCategory: varchar("directory_category", { length: 80 }),
  referralCode: varchar("referral_code", { length: 40 }),
  referredByBusinessId: uuid("referred_by_business_id").references((): AnyPgColumn => businesses.id, {
    onDelete: "set null",
  }),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  onboardingStep: integer("onboarding_step").default(0).notNull(),
  signupUtmSource: varchar("signup_utm_source", { length: 80 }),
  signupUtmMedium: varchar("signup_utm_medium", { length: 80 }),
  signupUtmCampaign: varchar("signup_utm_campaign", { length: 120 }),
  firstBookingAt: timestamp("first_booking_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// ─── Locations (branches) ─────────────────────────────────────────────────────

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  timezone: text("timezone").default("Asia/Colombo").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  aiConfig: jsonb("ai_config").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Partial index: allows multiple rows with NULL slug (no slug assigned yet)
  businessSlugUnique: uniqueIndex("locations_business_slug_unique")
    .on(table.businessId, table.slug)
    .where(sql`"slug" IS NOT NULL`),
}));

export const staffLocations = pgTable("staff_locations", {
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.staffId, table.locationId] }),
}));

// ─── Pro subscriptions (Dinaya billing its own customers) ───────────────────

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "past_due",
  "cancelled",
  "ended",
]);

export const billingIntervalEnum = pgEnum("billing_interval", ["monthly", "annual"]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  // PayHere identifiers
  payhereOrderId: varchar("payhere_order_id", { length: 100 }).notNull().unique(),
  payhereSubscriptionId: varchar("payhere_subscription_id", { length: 100 }).unique(),
  // Last processed PayHere recurring charge id. Recurring charges reuse the same
  // order_id, so renewal webhooks are deduped by per-charge payment_id.
  lastPaymentId: varchar("last_payment_id", { length: 100 }),
  // Plan being subscribed to (forward-compat: more tiers later)
  plan: planEnum("plan").default("pro").notNull(),
  billingInterval: billingIntervalEnum("billing_interval").default("monthly").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  amountLkr: integer("amount_lkr").notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Users (business owners + staff) ─────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").default("owner").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Audit / Activity Log ───────────────────────────────────────────────────

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: uuid("entity_id"),
  action: varchar("action", { length: 80 }).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    businessCreatedAtIdx: index("activity_log_business_created_at_idx").on(
      table.businessId,
      table.createdAt
    ),
  };
});

// ─── Service Categories ───────────────────────────────────────────────────────

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    businessNameUnique: uniqueIndex("service_categories_business_id_name_unique").on(
      table.businessId,
      table.name
    ),
  };
});

// ─── Services ─────────────────────────────────────────────────────────────────

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => serviceCategories.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 100 }).notNull(),
  // URL slug for /book/{business}/{serviceSlug}
  slug: varchar("slug", { length: 80 }),
  imageUrl: text("image_url"),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  priceLkr: integer("price_lkr").notNull().default(0),
  requiresPayment: boolean("requires_payment").default(false).notNull(),
  depositPercent: integer("deposit_percent").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Buffer time blocked before/after each appointment (minutes) — from Cal.diy
  beforeBuffer: integer("before_buffer").notNull().default(0),
  afterBuffer: integer("after_buffer").notNull().default(0),
  // Minimum notice required before a booking can be made (hours) — from Cal.diy
  minimumNoticeHours: integer("minimum_notice_hours").notNull().default(0),
  // Max bookings per staff per day for this service (null = unlimited) — from Cal.diy bookingLimits
  dailyCapacity: integer("daily_capacity"),
  // Rolling future-booking window: clients can only book this many days ahead (null = no limit) — from Cal.diy bookingLimits
  maximumAdvanceDays: integer("maximum_advance_days"),
  // Per-service intake/booking questions (null/[] = none). Configured by Pro+ businesses.
  intakeQuestions: jsonb("intake_questions").$type<import("@/lib/intake").IntakeQuestion[]>(),
  // Optional post-booking redirect (https URL or same-site path).
  successRedirectUrl: text("success_redirect_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  businessSlugUnique: uniqueIndex("services_business_slug_unique")
    .on(table.businessId, table.slug)
    .where(sql`${table.slug} IS NOT NULL`),
}));

// ─── Staff ────────────────────────────────────────────────────────────────────

export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Staff ↔ Services (many-to-many) ─────────────────────────────────────────

export const staffServices = pgTable("staff_services", {
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  priceOverrideLkr: integer("price_override_lkr"),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.staffId, table.serviceId] }),
  };
});

// ─── Availability (recurring weekly schedule) ─────────────────────────────────

export const availability = pgTable("availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayOfWeek: smallint("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
}, (table) => ({
  staffIdx: index("availability_staff_idx").on(table.staffId),
}));

// ─── Availability Overrides (holidays, one-off changes) ───────────────────────

export const availabilityOverrides = pgTable("availability_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  isBlocked: boolean("is_blocked").default(true).notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  reason: varchar("reason", { length: 200 }),
}, (table) => ({
  staffIdx: index("availability_overrides_staff_idx").on(table.staffId),
}));

export const businessHolidays = pgTable("business_holidays", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, {
    onDelete: "cascade",
  }),
  date: date("date").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  isClosed: boolean("is_closed").default(true).notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Unique per (business, branch, date). NULL location_id = business-wide holiday;
    // the COALESCE sentinel in migration 0009 ensures those are still unique per date.
    businessLocationDateUnique: uniqueIndex("business_holidays_business_id_location_id_date_unique").on(
      table.businessId,
      sql`COALESCE(${table.locationId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      table.date
    ),
  };
});

// ─── Deals ────────────────────────────────────────────────────────────────────

export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }),
  discountPercent: integer("discount_percent").notNull(),
  slotsTotal: integer("slots_total").notNull(),
  slotsRedeemed: integer("slots_redeemed").default(0).notNull(),
  impressionCount: integer("impression_count").default(0).notNull(),
  dealWindowStart: timestamp("deal_window_start", { withTimezone: true }).notNull(),
  dealWindowEnd: timestamp("deal_window_end", { withTimezone: true }).notNull(),
  apptWindowStart: timestamp("appt_window_start", { withTimezone: true }).notNull(),
  apptWindowEnd: timestamp("appt_window_end", { withTimezone: true }).notNull(),
  status: dealStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  statusDealWindowEndIdx: index("deals_status_deal_window_end_idx").on(
    table.status,
    table.dealWindowEnd,
  ),
  businessStatusIdx: index("deals_business_status_idx").on(table.businessId, table.status),
  businessCreatedAtIdx: index("deals_business_created_at_idx").on(
    table.businessId,
    table.createdAt,
  ),
}));

export const dealSuggestions = pgTable("deal_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  suggestedDiscountPercent: integer("suggested_discount_percent").notNull(),
  suggestedSlotsTotal: integer("suggested_slots_total").notNull(),
  apptWindowStart: timestamp("appt_window_start", { withTimezone: true }).notNull(),
  apptWindowEnd: timestamp("appt_window_end", { withTimezone: true }).notNull(),
  gapMinutes: integer("gap_minutes").notNull(),
  reason: text("reason").notNull(),
  meta: jsonb("meta"),
  status: dealSuggestionStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
  businessStatusIdx: index("deal_suggestions_business_status_idx").on(
    table.businessId,
    table.status,
  ),
}));

// ─── Slot reservations (temporary holds during public booking) ────────────────

export const slotReservations = pgTable(
  "slot_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    sessionToken: varchar("session_token", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    expiresIdx: index("slot_reservations_expires_idx").on(table.expiresAt),
    staffStartsIdx: index("slot_reservations_staff_starts_idx").on(table.staffId, table.startsAt),
  }),
);

export const bookingIdempotencyKeys = pgTable(
  "booking_idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    businessKeyUnique: uniqueIndex("booking_idempotency_business_key_unique").on(
      table.businessId,
      table.idempotencyKey,
    ),
    expiresIdx: index("booking_idempotency_expires_idx").on(table.expiresAt),
  }),
);

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id, {
    onDelete: "set null",
  }),
  staffId: uuid("staff_id").references(() => staff.id, {
    onDelete: "set null",
  }),
  locationId: uuid("location_id").references(() => locations.id, {
    onDelete: "set null",
  }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  source: varchar("source", { length: 40 }).default("public").notNull(),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
  discountedPriceLkr: integer("discounted_price_lkr"),
  dealSlotReleased: boolean("deal_slot_released").default(false).notNull(),
  attribution: jsonb("attribution"),
  notes: text("notes"),
  staffNotes: text("staff_notes"),
  // Answers to the service's intake questions, snapshotted at booking time.
  intakeAnswers: jsonb("intake_answers").$type<import("@/lib/intake").IntakeAnswer[]>(),
  reminderSentAt: timestamp("reminder_sent_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  businessStartsAtIdx: index("bookings_business_starts_at_idx").on(
    table.businessId,
    table.startsAt,
  ),
  businessStatusStartsAtIdx: index("bookings_business_status_starts_at_idx").on(
    table.businessId,
    table.status,
    table.startsAt,
  ),
  staffStartsAtIdx: index("bookings_staff_starts_at_idx").on(
    table.staffId,
    table.startsAt,
  ),
  locationIdIdx: index("bookings_location_id_idx").on(table.locationId),
  clientIdIdx: index("bookings_client_id_idx").on(table.clientId),
  dealIdIdx: index("bookings_deal_id_idx").on(table.dealId),
}));

export const bookingNotifications = pgTable("booking_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 40 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  provider: varchar("provider", { length: 40 }),
  providerMessageId: varchar("provider_message_id", { length: 180 }),
  error: text("error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  bookingTypeChannelUnique: uniqueIndex("booking_notifications_booking_type_channel_unique").on(
    table.bookingId,
    table.type,
    table.channel
  ),
  typeSentAtIdx: index("booking_notifications_type_sent_at_idx").on(table.type, table.sentAt),
}));

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  rating: smallint("rating").notNull(), // 1–5
  comment: text("comment"),
  ownerReply: text("owner_reply"),
  ownerRepliedAt: timestamp("owner_replied_at"),
  ownerReplySource: varchar("owner_reply_source", { length: 20 }),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    bookingUnique: uniqueIndex("reviews_booking_id_unique").on(table.bookingId),
    businessPublishedCreatedAtIdx: index("reviews_business_published_created_at_idx").on(
      table.businessId,
      table.isPublished,
      table.createdAt,
    ),
  };
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const webhookEventEnum = pgEnum("webhook_event", [
  "booking.created",
  "booking.confirmed",
  "booking.rescheduled",
  "booking.cancelled",
  "booking.completed",
  "booking.no_show",
]);

export const webhooks = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret"), // HMAC signing secret
  events: webhookEventEnum("events").array().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  businessActiveIdx: index("webhooks_business_active_idx").on(table.businessId, table.isActive),
}));

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  amountLkr: integer("amount_lkr").notNull(),
  provider: varchar("provider", { length: 20 }).default("payhere").notNull(),
  currency: varchar("currency", { length: 3 }).default("LKR").notNull(),
  providerOrderId: varchar("provider_order_id", { length: 100 }),
  status: paymentStatusEnum("status").default("pending").notNull(),
  payhereOrderId: varchar("payhere_order_id", { length: 100 }).unique(),
  payherePayload: jsonb("payhere_payload"),
  providerPayload: jsonb("provider_payload"),
  refundedAmountLkr: integer("refunded_amount_lkr").default(0).notNull(),
  refundedAt: timestamp("refunded_at"),
  refundReason: varchar("refund_reason", { length: 500 }),
  receiptSentAt: timestamp("receipt_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  bookingIdIdx: index("payments_booking_id_idx").on(table.bookingId),
  statusCreatedAtIdx: index("payments_status_created_at_idx").on(table.status, table.createdAt),
  providerOrderUnique: uniqueIndex("payments_provider_order_unique")
    .on(table.provider, table.providerOrderId)
    .where(sql`${table.providerOrderId} IS NOT NULL`),
}));

// ─── Automations / Messaging ─────────────────────────────────────────────────

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  trigger: varchar("trigger", { length: 80 }).notNull(),
  delayMinutes: integer("delay_minutes").default(0).notNull(),
  conditions: jsonb("conditions"),
  actions: jsonb("actions").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    businessTriggerIdx: index("automation_rules_business_trigger_idx").on(
      table.businessId,
      table.trigger
    ),
  };
});

export const automationRuns = pgTable("automation_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleId: uuid("rule_id")
    .notNull()
    .references(() => automationRules.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull(),
  triggerVersion: varchar("trigger_version", { length: 80 }).default("v1").notNull(),
  status: varchar("status", { length: 40 }).default("pending").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    ruleEntityVersionUnique: uniqueIndex("automation_runs_rule_entity_version_unique").on(
      table.ruleId,
      table.entityId,
      table.triggerVersion
    ),
  };
});

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 40 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 200 }),
  body: text("body").notNull(),
  variables: text("variables").array(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communications = pgTable("communications", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, {
    onDelete: "set null",
  }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  channel: varchar("channel", { length: 40 }).notNull(),
  direction: varchar("direction", { length: 20 }).default("outbound").notNull(),
  status: varchar("status", { length: 40 }).default("pending").notNull(),
  subject: varchar("subject", { length: 200 }),
  body: text("body"),
  providerMessageId: varchar("provider_message_id", { length: 180 }),
  provider: varchar("provider", { length: 80 }),
  feature: varchar("feature", { length: 80 }),
  idempotencyKey: varchar("idempotency_key", { length: 180 }),
  meta: jsonb("meta"),
  error: text("error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    businessCreatedAtIdx: index("communications_business_created_at_idx").on(
      table.businessId,
      table.createdAt
    ),
    businessIdempotencyUnique: uniqueIndex("communications_business_idempotency_unique").on(
      table.businessId,
      table.idempotencyKey
    ),
  };
});

// ─── AI Growth Workflows ──────────────────────────────────────────────────────

export const aiWorkflowRuns = pgTable("ai_workflow_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, {
    onDelete: "set null",
  }),
  feature: varchar("feature", { length: 80 }).notNull(),
  workflowKey: varchar("workflow_key", { length: 160 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }),
  entityId: uuid("entity_id"),
  channel: varchar("channel", { length: 40 }),
  provider: varchar("provider", { length: 80 }),
  status: varchar("status", { length: 40 }).default("queued").notNull(),
  subject: varchar("subject", { length: 200 }),
  body: text("body"),
  scheduledFor: timestamp("scheduled_for"),
  executedAt: timestamp("executed_at"),
  idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),
  error: text("error"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  businessFeatureIdx: index("ai_workflow_runs_business_feature_idx").on(
    table.businessId,
    table.feature
  ),
  businessCreatedAtIdx: index("ai_workflow_runs_business_created_at_idx").on(
    table.businessId,
    table.createdAt
  ),
  businessIdempotencyUnique: uniqueIndex("ai_workflow_runs_business_idempotency_unique").on(
    table.businessId,
    table.idempotencyKey
  ),
}));

export const aiContentCalendar = pgTable("ai_content_calendar", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  contentDate: date("content_date").notNull(),
  channel: varchar("channel", { length: 40 }).default("social").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  caption: text("caption").notNull(),
  status: varchar("status", { length: 40 }).default("draft").notNull(),
  approvedAt: timestamp("approved_at"),
  publishedAt: timestamp("published_at"),
  provider: varchar("provider", { length: 80 }),
  providerMessageId: varchar("provider_message_id", { length: 180 }),
  error: text("error"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessDateIdx: index("ai_content_calendar_business_date_idx").on(
    table.businessId,
    table.contentDate
  ),
  businessLocationDateUnique: uniqueIndex("ai_content_calendar_business_location_date_unique").on(
    table.businessId,
    table.locationId,
    table.contentDate
  ),
}));

export const socialConnections = pgTable("social_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  accountId: varchar("account_id", { length: 160 }),
  accountName: varchar("account_name", { length: 160 }),
  accessTokenEncrypted: text("access_token_encrypted"),
  isActive: boolean("is_active").default(true).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessProviderUnique: uniqueIndex("social_connections_business_provider_unique").on(
    table.businessId,
    table.provider
  ),
}));

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
});

export const adminAuditEvents = pgTable("admin_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  at: timestamp("at").defaultNow().notNull(),
  actorEmail: varchar("actor_email", { length: 255 }).notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  target: varchar("target", { length: 500 }),
  meta: jsonb("meta"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  previousHash: varchar("previous_hash", { length: 64 }),
  eventHash: varchar("event_hash", { length: 64 }),
}, (table) => ({
  atIdx: index("admin_audit_events_at_idx").on(table.at),
}));

export const platformAdminMembers = pgTable("platform_admin_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  invitedBy: varchar("invited_by", { length: 255 }),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  revokedAt: timestamp("revoked_at"),
  status: varchar("status", { length: 40 }).default("active").notNull(),
}, (table) => ({
  statusIdx: index("platform_admin_members_status_idx").on(table.status),
}));

// ─── Webhook Deliveries / Reporting / API Access ─────────────────────────────

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookId: uuid("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  event: webhookEventEnum("event").notNull(),
  entityId: uuid("entity_id"),
  status: varchar("status", { length: 40 }).default("pending").notNull(),
  statusCode: integer("status_code"),
  requestBody: jsonb("request_body"),
  responseBody: text("response_body"),
  error: text("error"),
  attempts: integer("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    webhookCreatedAtIdx: index("webhook_deliveries_webhook_created_at_idx").on(
      table.webhookId,
      table.createdAt
    ),
  };
});

export const metricsDaily = pgTable("metrics_daily", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  metric: varchar("metric", { length: 80 }).notNull(),
  dims: jsonb("dims"),
  value: numeric("value", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    businessMetricDateUnique: uniqueIndex("metrics_daily_business_metric_date_dims_unique").on(
      table.businessId,
      table.date,
      table.metric,
      table.dims
    ),
  };
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  keyType: varchar("key_type", { length: 40 }).default("generic").notNull(),
  deviceId: varchar("device_id", { length: 120 }),
  deviceName: varchar("device_name", { length: 120 }),
  keyHash: text("key_hash").notNull(),
  scopes: text("scopes").array().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    keyHashUnique: uniqueIndex("api_keys_key_hash_unique").on(table.keyHash),
    businessTypeIdx: index("api_keys_business_key_type_idx").on(table.businessId, table.keyType),
  };
});

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  channel: varchar("channel", { length: 40 }).notNull(),
  subject: varchar("subject", { length: 200 }),
  body: text("body").notNull(),
  audienceType: varchar("audience_type", { length: 40 }).notNull(),
  audienceFilter: jsonb("audience_filter"),
  status: varchar("status", { length: 40 }).default("draft").notNull(),
  recipientCount: integer("recipient_count").default(0).notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  skippedCount: integer("skipped_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessCreatedAtIdx: index("broadcasts_business_created_at_idx").on(
    table.businessId,
    table.createdAt,
  ),
}));

export const voiceIntegrations = pgTable("voice_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 40 }).default("not_requested").notNull(),
  providerName: varchar("provider_name", { length: 120 }).default("Peak Agents").notNull(),
  businessPhone: varchar("business_phone", { length: 30 }),
  aiPhoneNumber: varchar("ai_phone_number", { length: 30 }),
  handoffPhone: varchar("handoff_phone", { length: 30 }),
  languages: text("languages").array().default(sql`ARRAY['en']::text[]`).notNull(),
  welcomeMessage: text("welcome_message"),
  fallbackMessage: text("fallback_message"),
  openingRules: text("opening_rules"),
  serviceRules: text("service_rules"),
  bookingRules: text("booking_rules"),
  faqNotes: text("faq_notes"),
  setupNotes: text("setup_notes"),
  requestedAt: timestamp("requested_at"),
  lastTestedAt: timestamp("last_tested_at"),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    businessUnique: uniqueIndex("voice_integrations_business_id_unique").on(table.businessId),
    statusIdx: index("voice_integrations_status_idx").on(table.status),
  };
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(users),
  services: many(services),
  serviceCategories: many(serviceCategories),
  staff: many(staff),
  locations: many(locations),
  bookings: many(bookings),
  clients: many(clients),
  activityLog: many(activityLog),
  businessHolidays: many(businessHolidays),
  automationRules: many(automationRules),
  messageTemplates: many(messageTemplates),
  communications: many(communications),
  aiWorkflowRuns: many(aiWorkflowRuns),
  aiContentCalendar: many(aiContentCalendar),
  socialConnections: many(socialConnections),
  metricsDaily: many(metricsDaily),
  apiKeys: many(apiKeys),
  broadcasts: many(broadcasts),
  voiceIntegrations: many(voiceIntegrations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  business: one(businesses, { fields: [users.businessId], references: [businesses.id] }),
  activityLog: many(activityLog),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  business: one(businesses, { fields: [activityLog.businessId], references: [businesses.id] }),
  actor: one(users, { fields: [activityLog.actorUserId], references: [users.id] }),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ one, many }) => ({
  business: one(businesses, {
    fields: [serviceCategories.businessId],
    references: [businesses.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  business: one(businesses, { fields: [services.businessId], references: [businesses.id] }),
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  staffServices: many(staffServices),
  bookings: many(bookings),
}));


export const locationsRelations = relations(locations, ({ one, many }) => ({
  business: one(businesses, { fields: [locations.businessId], references: [businesses.id] }),
  staffLocations: many(staffLocations),
  bookings: many(bookings),
}));

export const staffLocationsRelations = relations(staffLocations, ({ one }) => ({
  staff: one(staff, { fields: [staffLocations.staffId], references: [staff.id] }),
  location: one(locations, { fields: [staffLocations.locationId], references: [locations.id] }),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  business: one(businesses, { fields: [staff.businessId], references: [businesses.id] }),
  staffServices: many(staffServices),
  availability: many(availability),
  availabilityOverrides: many(availabilityOverrides),
  bookings: many(bookings),
}));

export const staffServicesRelations = relations(staffServices, ({ one }) => ({
  staff: one(staff, { fields: [staffServices.staffId], references: [staff.id] }),
  service: one(services, { fields: [staffServices.serviceId], references: [services.id] }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  staff: one(staff, { fields: [availability.staffId], references: [staff.id] }),
}));

export const availabilityOverridesRelations = relations(availabilityOverrides, ({ one }) => ({
  staff: one(staff, { fields: [availabilityOverrides.staffId], references: [staff.id] }),
}));

export const businessHolidaysRelations = relations(businessHolidays, ({ one }) => ({
  business: one(businesses, {
    fields: [businessHolidays.businessId],
    references: [businesses.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  business: one(businesses, { fields: [bookings.businessId], references: [businesses.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  staff: one(staff, { fields: [bookings.staffId], references: [staff.id] }),
  client: one(clients, { fields: [bookings.clientId], references: [clients.id] }),
  payment: one(payments, { fields: [bookings.id], references: [payments.bookingId] }),
  communications: many(communications),
  notifications: many(bookingNotifications),
}));

export const bookingNotificationsRelations = relations(bookingNotifications, ({ one }) => ({
  booking: one(bookings, { fields: [bookingNotifications.bookingId], references: [bookings.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  business: one(businesses, { fields: [clients.businessId], references: [businesses.id] }),
  bookings: many(bookings),
  notes: many(clientNotes),
  communications: many(communications),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(clients, { fields: [clientNotes.clientId], references: [clients.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  business: one(businesses, { fields: [reviews.businessId], references: [businesses.id] }),
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  business: one(businesses, { fields: [webhooks.businessId], references: [businesses.id] }),
  deliveries: many(webhookDeliveries),
}));

export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  business: one(businesses, {
    fields: [automationRules.businessId],
    references: [businesses.id],
  }),
  runs: many(automationRuns),
}));

export const automationRunsRelations = relations(automationRuns, ({ one }) => ({
  rule: one(automationRules, {
    fields: [automationRuns.ruleId],
    references: [automationRules.id],
  }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  business: one(businesses, {
    fields: [messageTemplates.businessId],
    references: [businesses.id],
  }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  business: one(businesses, {
    fields: [communications.businessId],
    references: [businesses.id],
  }),
  booking: one(bookings, {
    fields: [communications.bookingId],
    references: [bookings.id],
  }),
  client: one(clients, {
    fields: [communications.clientId],
    references: [clients.id],
  }),
}));

export const aiWorkflowRunsRelations = relations(aiWorkflowRuns, ({ one }) => ({
  business: one(businesses, {
    fields: [aiWorkflowRuns.businessId],
    references: [businesses.id],
  }),
  location: one(locations, {
    fields: [aiWorkflowRuns.locationId],
    references: [locations.id],
  }),
}));

export const aiContentCalendarRelations = relations(aiContentCalendar, ({ one }) => ({
  business: one(businesses, {
    fields: [aiContentCalendar.businessId],
    references: [businesses.id],
  }),
  location: one(locations, {
    fields: [aiContentCalendar.locationId],
    references: [locations.id],
  }),
}));

export const socialConnectionsRelations = relations(socialConnections, ({ one }) => ({
  business: one(businesses, {
    fields: [socialConnections.businessId],
    references: [businesses.id],
  }),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

export const metricsDailyRelations = relations(metricsDaily, ({ one }) => ({
  business: one(businesses, {
    fields: [metricsDaily.businessId],
    references: [businesses.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  business: one(businesses, { fields: [apiKeys.businessId], references: [businesses.id] }),
}));

export const voiceIntegrationsRelations = relations(voiceIntegrations, ({ one }) => ({
  business: one(businesses, {
    fields: [voiceIntegrations.businessId],
    references: [businesses.id],
  }),
  apiKey: one(apiKeys, {
    fields: [voiceIntegrations.apiKeyId],
    references: [apiKeys.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type Availability = typeof availability.$inferSelect;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type BusinessHoliday = typeof businessHolidays.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingNotification = typeof bookingNotifications.$inferSelect;
export type NewBookingNotification = typeof bookingNotifications.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientNote = typeof clientNotes.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type AutomationRule = typeof automationRules.$inferSelect;
export type NewAutomationRule = typeof automationRules.$inferInsert;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type AiWorkflowRun = typeof aiWorkflowRuns.$inferSelect;
export type NewAiWorkflowRun = typeof aiWorkflowRuns.$inferInsert;
export type AiContentCalendarItem = typeof aiContentCalendar.$inferSelect;
export type NewAiContentCalendarItem = typeof aiContentCalendar.$inferInsert;
export type SocialConnection = typeof socialConnections.$inferSelect;
export type MetricsDaily = typeof metricsDaily.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Broadcast = typeof broadcasts.$inferSelect;
export type NewBroadcast = typeof broadcasts.$inferInsert;
export type VoiceIntegration = typeof voiceIntegrations.$inferSelect;
export type NewVoiceIntegration = typeof voiceIntegrations.$inferInsert;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type AdminAuditEventRow = typeof adminAuditEvents.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
