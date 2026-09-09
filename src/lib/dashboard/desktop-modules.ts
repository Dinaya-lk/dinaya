import { endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, asc, avg, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiContentCalendar,
  aiWorkflowRuns,
  apiKeys,
  automationRules,
  availability,
  bookings,
  broadcasts,
  businesses,
  clients,
  deals,
  locations,
  metricsDaily,
  payments,
  reviews,
  services,
  socialConnections,
  staff,
  subscriptions,
  voiceIntegrations,
} from "@/db/schema";
import { marketingToolIds } from "@/lib/dashboard/marketing";
import {
  VOICE_RECEPTIONIST_ROLLOUT,
  isVoiceReceptionistRolloutOpen,
} from "@/lib/voice-receptionist";

export type DesktopModuleKey =
  | "overview"
  | "calendar"
  | "clients"
  | "services"
  | "staff"
  | "locations"
  | "availability"
  | "reviews"
  | "payments"
  | "marketing"
  | "deals"
  | "broadcasts"
  | "ai"
  | "reports"
  | "integrations"
  | "automations"
  | "billing"
  | "settings";

export type DesktopModuleMetric = {
  detail?: string;
  label: string;
  tone?: "amber" | "cobalt" | "emerald" | "slate";
  value: string | number;
};

export type DesktopModuleItem = {
  id: string;
  meta?: string;
  status?: string;
  subtitle?: string;
  title: string;
};

export type DesktopModulePayload = {
  emptyState: string;
  items: DesktopModuleItem[];
  metrics: DesktopModuleMetric[];
  module: DesktopModuleKey;
  refreshedAt: string;
  summary: string;
  title: string;
  webPath: string;
};

const moduleLabels: Record<DesktopModuleKey, { emptyState: string; summary: string; title: string; webPath: string }> = {
  ai: {
    emptyState: "No AI workflow activity yet.",
    summary: "Generated replies, growth workflows, and AI activity.",
    title: "AI Hub",
    webPath: "/dashboard/ai",
  },
  automations: {
    emptyState: "No automations configured yet.",
    summary: "Automation rules and enablement state.",
    title: "Automations",
    webPath: "/dashboard/automations",
  },
  availability: {
    emptyState: "No availability windows configured yet.",
    summary: "Weekly working windows by active staff member.",
    title: "Availability",
    webPath: "/dashboard/availability",
  },
  billing: {
    emptyState: "No subscription records found.",
    summary: "Current plan and billing subscription state.",
    title: "Plan & billing",
    webPath: "/dashboard/billing",
  },
  broadcasts: {
    emptyState: "No broadcasts created yet.",
    summary: "Campaign broadcasts and delivery summaries.",
    title: "Broadcasts",
    webPath: "/dashboard/broadcasts",
  },
  calendar: {
    emptyState: "No bookings scheduled for today.",
    summary: "Today calendar with staff and booking status.",
    title: "Calendar",
    webPath: "/dashboard/calendar",
  },
  clients: {
    emptyState: "No clients found yet.",
    summary: "Client CRM records and stages.",
    title: "Clients",
    webPath: "/dashboard/clients",
  },
  deals: {
    emptyState: "No deals created yet.",
    summary: "Deal status, slot usage, and impressions.",
    title: "Deals",
    webPath: "/dashboard/deals",
  },
  integrations: {
    emptyState: "No integrations connected yet.",
    summary: "Connected provider and voice integration status.",
    title: "Integrations",
    webPath: "/dashboard/settings/integrations",
  },
  locations: {
    emptyState: "No locations configured yet.",
    summary: "Branch coverage and active location status.",
    title: "Locations",
    webPath: "/dashboard/locations",
  },
  marketing: {
    emptyState: "No marketing assets configured yet.",
    summary: "Directory listing, social channels, and content calendar.",
    title: "Marketing",
    webPath: "/dashboard/marketing",
  },
  overview: {
    emptyState: "No activity yet.",
    summary: "Business health and current day activity.",
    title: "Overview",
    webPath: "/dashboard",
  },
  payments: {
    emptyState: "No payments found yet.",
    summary: "Recent payments and payment status.",
    title: "Payments",
    webPath: "/dashboard/payments",
  },
  reports: {
    emptyState: "No report metrics recorded yet.",
    summary: "Recent operating metrics and revenue snapshots.",
    title: "Reports",
    webPath: "/dashboard/reports",
  },
  reviews: {
    emptyState: "No reviews collected yet.",
    summary: "Published reviews, ratings, and replies.",
    title: "Reviews",
    webPath: "/dashboard/reviews",
  },
  services: {
    emptyState: "No services configured yet.",
    summary: "Service catalog, pricing, duration, and public availability.",
    title: "Services",
    webPath: "/dashboard/services",
  },
  settings: {
    emptyState: "No desktop devices found.",
    summary: "Business profile and desktop device access.",
    title: "Settings",
    webPath: "/dashboard/settings",
  },
  staff: {
    emptyState: "No staff members configured yet.",
    summary: "Active staff and appointment load.",
    title: "Staff",
    webPath: "/dashboard/staff",
  },
};

function metric(
  label: string,
  value: string | number,
  detail?: string,
  tone: DesktopModuleMetric["tone"] = "slate",
): DesktopModuleMetric {
  return { detail, label, tone, value };
}

function item(row: DesktopModuleItem): DesktopModuleItem {
  return row;
}

function dateText(value: Date | null | undefined): string {
  if (!value) return "Not set";
  return value.toISOString();
}

function moneyLkr(value: number | null | undefined): string {
  return `LKR ${Number(value ?? 0).toLocaleString("en-LK")}`;
}

function weekdayName(day: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? `Day ${day}`;
}

async function getBusiness(businessId: string) {
  const [business] = await db
    .select({
      address: businesses.address,
      customDomain: businesses.customDomain,
      directoryListed: businesses.directoryListed,
      email: businesses.email,
      id: businesses.id,
      name: businesses.name,
      payhereEnabled: businesses.payhereEnabled,
      phone: businesses.phone,
      plan: businesses.plan,
      slug: businesses.slug,
      timezone: businesses.timezone,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business;
}

async function todayWindow(businessId: string) {
  const business = await getBusiness(businessId);
  const timezone = business?.timezone ?? "Asia/Colombo";
  const now = new Date();
  const localNow = toZonedTime(now, timezone);
  return {
    business,
    dayEnd: fromZonedTime(endOfDay(localNow), timezone),
    dayStart: fromZonedTime(startOfDay(localNow), timezone),
    now,
  };
}

function payload(
  module: DesktopModuleKey,
  metrics: DesktopModuleMetric[],
  items: DesktopModuleItem[],
): DesktopModulePayload {
  const labels = moduleLabels[module];
  return {
    emptyState: labels.emptyState,
    items,
    metrics,
    module,
    refreshedAt: new Date().toISOString(),
    summary: labels.summary,
    title: labels.title,
    webPath: labels.webPath,
  };
}

export function isDesktopModuleKey(value: string): value is DesktopModuleKey {
  return value in moduleLabels;
}

export async function getDesktopModuleData(
  businessId: string,
  module: DesktopModuleKey,
): Promise<DesktopModulePayload> {
  if (module === "overview" || module === "calendar") {
    const { dayEnd, dayStart } = await todayWindow(businessId);
    const rows = await db
      .select({
        id: bookings.id,
        clientName: bookings.clientName,
        serviceName: services.name,
        staffName: staff.name,
        startsAt: bookings.startsAt,
        status: bookings.status,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(staff, eq(bookings.staffId, staff.id))
      .where(and(eq(bookings.businessId, businessId), gte(bookings.startsAt, dayStart), lt(bookings.startsAt, dayEnd)))
      .orderBy(asc(bookings.startsAt))
      .limit(30);

    return payload(
      module,
      [
        metric("Today", rows.length, "Bookings scheduled", "cobalt"),
        metric("Pending", rows.filter((row) => row.status === "pending").length, "Need action", "amber"),
        metric("Confirmed", rows.filter((row) => row.status === "confirmed").length, "Ready appointments", "emerald"),
        metric("Staff", new Set(rows.map((row) => row.staffName)).size, "Booked today", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.startsAt),
        status: row.status,
        subtitle: `${row.serviceName} with ${row.staffName}`,
        title: row.clientName,
      })),
    );
  }

  if (module === "clients") {
    const [total] = await db.select({ value: count() }).from(clients).where(eq(clients.businessId, businessId));
    const rows = await db
      .select({
        createdAt: clients.createdAt,
        email: clients.email,
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        stage: clients.stage,
      })
      .from(clients)
      .where(eq(clients.businessId, businessId))
      .orderBy(desc(clients.createdAt))
      .limit(40);

    return payload(
      module,
      [
        metric("Clients", total?.value ?? 0, "CRM records", "cobalt"),
        metric("Leads", rows.filter((row) => row.stage === "lead").length, "Recent page", "amber"),
        metric("Active", rows.filter((row) => row.stage === "active").length, "Recent page", "emerald"),
        metric("Opt-in", rows.filter((row) => row.email).length, "With email", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.createdAt),
        status: row.stage,
        subtitle: row.email ? `${row.phone} · ${row.email}` : row.phone,
        title: row.name,
      })),
    );
  }

  if (module === "services") {
    const rows = await db
      .select({
        durationMinutes: services.durationMinutes,
        id: services.id,
        isActive: services.isActive,
        name: services.name,
        priceLkr: services.priceLkr,
        requiresPayment: services.requiresPayment,
      })
      .from(services)
      .where(eq(services.businessId, businessId))
      .orderBy(asc(services.name))
      .limit(50);

    return payload(
      module,
      [
        metric("Services", rows.length, "Catalog size", "cobalt"),
        metric("Active", rows.filter((row) => row.isActive).length, "Bookable", "emerald"),
        metric("Deposits", rows.filter((row) => row.requiresPayment).length, "Payment required", "amber"),
        metric("Avg duration", rows.length ? `${Math.round(rows.reduce((sum, row) => sum + row.durationMinutes, 0) / rows.length)}m` : "0m", "Across catalog", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: `${row.durationMinutes} min`,
        status: row.isActive ? "active" : "inactive",
        subtitle: moneyLkr(row.priceLkr),
        title: row.name,
      })),
    );
  }

  if (module === "staff") {
    const { dayEnd, dayStart } = await todayWindow(businessId);
    const rows = await db
      .select({
        id: staff.id,
        isActive: staff.isActive,
        name: staff.name,
        todayBookings: sql<number>`coalesce(count(${bookings.id}), 0)::int`,
      })
      .from(staff)
      .leftJoin(bookings, and(eq(bookings.staffId, staff.id), gte(bookings.startsAt, dayStart), lt(bookings.startsAt, dayEnd)))
      .where(eq(staff.businessId, businessId))
      .groupBy(staff.id)
      .orderBy(asc(staff.name))
      .limit(50);

    return payload(
      module,
      [
        metric("Staff", rows.length, "Team members", "cobalt"),
        metric("Active", rows.filter((row) => row.isActive).length, "Available profiles", "emerald"),
        metric("Booked today", rows.filter((row) => Number(row.todayBookings) > 0).length, "With appointments", "amber"),
        metric("Appointments", rows.reduce((sum, row) => sum + Number(row.todayBookings), 0), "Today", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: `${Number(row.todayBookings)} today`,
        status: row.isActive ? "active" : "inactive",
        subtitle: row.isActive ? "Accepting bookings" : "Hidden from booking flow",
        title: row.name,
      })),
    );
  }

  if (module === "locations") {
    const rows = await db
      .select({
        address: locations.address,
        id: locations.id,
        isActive: locations.isActive,
        isDefault: locations.isDefault,
        name: locations.name,
        phone: locations.phone,
        timezone: locations.timezone,
      })
      .from(locations)
      .where(eq(locations.businessId, businessId))
      .orderBy(asc(locations.sortOrder), asc(locations.name))
      .limit(40);

    return payload(
      module,
      [
        metric("Locations", rows.length, "Branches", "cobalt"),
        metric("Active", rows.filter((row) => row.isActive).length, "Bookable", "emerald"),
        metric("Default", rows.filter((row) => row.isDefault).length, "Primary branch", "amber"),
        metric("Timezones", new Set(rows.map((row) => row.timezone)).size, "Configured", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: row.timezone,
        status: row.isActive ? "active" : "inactive",
        subtitle: row.address ?? row.phone ?? "No address set",
        title: row.isDefault ? `${row.name} · Default` : row.name,
      })),
    );
  }

  if (module === "availability") {
    const rows = await db
      .select({
        dayOfWeek: availability.dayOfWeek,
        endTime: availability.endTime,
        id: availability.id,
        staffName: staff.name,
        startTime: availability.startTime,
      })
      .from(availability)
      .innerJoin(staff, eq(availability.staffId, staff.id))
      .where(eq(staff.businessId, businessId))
      .orderBy(asc(availability.dayOfWeek), asc(availability.startTime))
      .limit(80);

    return payload(
      module,
      [
        metric("Windows", rows.length, "Weekly slots", "cobalt"),
        metric("Staff covered", new Set(rows.map((row) => row.staffName)).size, "With availability", "emerald"),
        metric("Days covered", new Set(rows.map((row) => row.dayOfWeek)).size, "Open days", "amber"),
        metric("Timezone", (await getBusiness(businessId))?.timezone ?? "Asia/Colombo", "Business default", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: `${row.startTime} - ${row.endTime}`,
        subtitle: row.staffName,
        title: weekdayName(row.dayOfWeek),
      })),
    );
  }

  if (module === "reviews") {
    const [summary] = await db
      .select({ average: avg(reviews.rating), value: count() })
      .from(reviews)
      .where(eq(reviews.businessId, businessId));
    const rows = await db
      .select({
        clientName: reviews.clientName,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        id: reviews.id,
        ownerReply: reviews.ownerReply,
        rating: reviews.rating,
      })
      .from(reviews)
      .where(eq(reviews.businessId, businessId))
      .orderBy(desc(reviews.createdAt))
      .limit(40);

    return payload(
      module,
      [
        metric("Reviews", summary?.value ?? 0, "Published records", "cobalt"),
        metric("Average", Number(summary?.average ?? 0).toFixed(1), "Rating", "emerald"),
        metric("Need reply", rows.filter((row) => !row.ownerReply).length, "Recent page", "amber"),
        metric("5-star", rows.filter((row) => row.rating === 5).length, "Recent page", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.createdAt),
        status: `${row.rating}/5`,
        subtitle: row.comment ?? "No comment",
        title: row.clientName,
      })),
    );
  }

  if (module === "payments") {
    const [summary] = await db
      .select({
        revenue: sql<number>`coalesce(sum(${payments.amountLkr}) filter (where ${payments.status} = 'success'), 0)::int`,
        value: count(),
      })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.businessId, businessId));
    const rows = await db
      .select({
        amountLkr: payments.amountLkr,
        clientName: bookings.clientName,
        createdAt: payments.createdAt,
        id: payments.id,
        orderId: payments.payhereOrderId,
        status: payments.status,
      })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.businessId, businessId))
      .orderBy(desc(payments.createdAt))
      .limit(40);

    return payload(
      module,
      [
        metric("Payments", summary?.value ?? 0, "All statuses", "cobalt"),
        metric("Revenue", moneyLkr(summary?.revenue), "Successful payments", "emerald"),
        metric("Pending", rows.filter((row) => row.status === "pending").length, "Recent page", "amber"),
        metric("Failed", rows.filter((row) => row.status === "failed").length, "Recent page", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.createdAt),
        status: row.status,
        subtitle: `${row.clientName} · ${row.orderId ?? "No PayHere order"}`,
        title: moneyLkr(row.amountLkr),
      })),
    );
  }

  if (module === "marketing") {
    const business = await getBusiness(businessId);
    const [connectionCount] = await db.select({ value: count() }).from(socialConnections).where(eq(socialConnections.businessId, businessId));
    const rows = await db
      .select({
        contentDate: aiContentCalendar.contentDate,
        id: aiContentCalendar.id,
        status: aiContentCalendar.status,
        title: aiContentCalendar.title,
      })
      .from(aiContentCalendar)
      .where(eq(aiContentCalendar.businessId, businessId))
      .orderBy(desc(aiContentCalendar.contentDate))
      .limit(30);

    const toolTitles: Record<(typeof marketingToolIds)[number], string> = {
      "tool-booking-link": "Booking link",
      "tool-qr-poster": "QR poster",
      "tool-website-embed": "Website embeds",
      "tool-whatsapp-share": "WhatsApp share",
    };
    const toolSubtitles: Record<(typeof marketingToolIds)[number], string> = {
      "tool-booking-link": "Share your public booking page",
      "tool-qr-poster": "Download counter and poster QR assets",
      "tool-website-embed": "Embed booking and reviews widgets",
      "tool-whatsapp-share": "Copy ready-to-send social text",
    };

    return payload(
      module,
      [
        metric("Directory", business?.directoryListed ? "Listed" : "Hidden", "Public discovery", business?.directoryListed ? "emerald" : "amber"),
        metric("Social", connectionCount?.value ?? 0, "Connected accounts", "cobalt"),
        metric("Content", rows.length, "Calendar items", "slate"),
        metric("Website", business?.customDomain ? "Custom" : "Subdomain", "Booking URL", "slate"),
      ],
      [
        ...marketingToolIds.map((toolId) => item({
          id: toolId,
          status: "tool",
          subtitle: toolSubtitles[toolId],
          title: toolTitles[toolId],
        })),
        ...rows.map((row) => item({
          id: row.id,
          meta: row.contentDate,
          status: row.status,
          subtitle: "AI content calendar",
          title: row.title,
        })),
      ],
    );
  }

  if (module === "deals") {
    const rows = await db
      .select({
        discountPercent: deals.discountPercent,
        id: deals.id,
        impressions: deals.impressionCount,
        redeemed: deals.slotsRedeemed,
        serviceName: services.name,
        slotsTotal: deals.slotsTotal,
        status: deals.status,
        windowEnd: deals.dealWindowEnd,
      })
      .from(deals)
      .innerJoin(services, eq(deals.serviceId, services.id))
      .where(eq(deals.businessId, businessId))
      .orderBy(desc(deals.createdAt))
      .limit(40);

    return payload(
      module,
      [
        metric("Deals", rows.length, "Created", "cobalt"),
        metric("Active", rows.filter((row) => row.status === "active").length, "Live now", "emerald"),
        metric("Redeemed", rows.reduce((sum, row) => sum + row.redeemed, 0), "Slots claimed", "amber"),
        metric("Impressions", rows.reduce((sum, row) => sum + row.impressions, 0), "Directory views", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.windowEnd),
        status: row.status,
        subtitle: `${row.discountPercent}% off · ${row.redeemed}/${row.slotsTotal} redeemed`,
        title: row.serviceName,
      })),
    );
  }

  if (module === "broadcasts") {
    const rows = await db
      .select({
        channel: broadcasts.channel,
        createdAt: broadcasts.createdAt,
        failedCount: broadcasts.failedCount,
        id: broadcasts.id,
        name: broadcasts.name,
        recipientCount: broadcasts.recipientCount,
        sentCount: broadcasts.sentCount,
        status: broadcasts.status,
      })
      .from(broadcasts)
      .where(eq(broadcasts.businessId, businessId))
      .orderBy(desc(broadcasts.createdAt))
      .limit(40);

    return payload(
      module,
      [
        metric("Broadcasts", rows.length, "Created", "cobalt"),
        metric("Sent", rows.filter((row) => row.status === "sent").length, "Completed", "emerald"),
        metric("Recipients", rows.reduce((sum, row) => sum + row.recipientCount, 0), "Targeted", "amber"),
        metric("Failed", rows.reduce((sum, row) => sum + row.failedCount, 0), "Delivery failures", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.createdAt),
        status: row.status,
        subtitle: `${row.channel} · ${row.sentCount}/${row.recipientCount} sent`,
        title: row.name,
      })),
    );
  }

  if (module === "ai") {
    const rows = await db
      .select({
        createdAt: aiWorkflowRuns.createdAt,
        feature: aiWorkflowRuns.feature,
        id: aiWorkflowRuns.id,
        status: aiWorkflowRuns.status,
        subject: aiWorkflowRuns.subject,
        workflowKey: aiWorkflowRuns.workflowKey,
      })
      .from(aiWorkflowRuns)
      .where(eq(aiWorkflowRuns.businessId, businessId))
      .orderBy(desc(aiWorkflowRuns.createdAt))
      .limit(40);

    return payload(
      module,
      [
        metric("Runs", rows.length, "Recent workflows", "cobalt"),
        metric("Queued", rows.filter((row) => row.status === "queued").length, "Waiting", "amber"),
        metric("Done", rows.filter((row) => row.status === "completed").length, "Completed", "emerald"),
        metric("Failed", rows.filter((row) => row.status === "failed").length, "Needs review", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.createdAt),
        status: row.status,
        subtitle: row.workflowKey,
        title: row.subject ?? row.feature,
      })),
    );
  }

  if (module === "reports") {
    const rows = await db
      .select({
        date: metricsDaily.date,
        id: metricsDaily.id,
        metric: metricsDaily.metric,
        value: metricsDaily.value,
      })
      .from(metricsDaily)
      .where(eq(metricsDaily.businessId, businessId))
      .orderBy(desc(metricsDaily.date))
      .limit(40);
    const [bookingTotal] = await db.select({ value: count() }).from(bookings).where(eq(bookings.businessId, businessId));
    const [paymentTotal] = await db
      .select({ value: sql<number>`coalesce(sum(${payments.amountLkr}) filter (where ${payments.status} = 'success'), 0)::int` })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.businessId, businessId));

    return payload(
      module,
      [
        metric("Bookings", bookingTotal?.value ?? 0, "All time", "cobalt"),
        metric("Revenue", moneyLkr(paymentTotal?.value), "Successful payments", "emerald"),
        metric("Metrics", rows.length, "Daily rows", "amber"),
        metric("Latest", rows[0]?.date ?? "None", "Metric date", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: row.date,
        subtitle: String(row.value),
        title: row.metric,
      })),
    );
  }

  if (module === "integrations") {
    const business = await getBusiness(businessId);
    const voiceRolloutOpen = isVoiceReceptionistRolloutOpen();
    const socialRows = await db
      .select({
        id: socialConnections.id,
        isActive: socialConnections.isActive,
        provider: socialConnections.provider,
        accountName: socialConnections.accountName,
      })
      .from(socialConnections)
      .where(eq(socialConnections.businessId, businessId))
      .orderBy(asc(socialConnections.provider))
      .limit(30);
    const voiceRows = voiceRolloutOpen
      ? await db
          .select({
            id: voiceIntegrations.id,
            providerName: voiceIntegrations.providerName,
            status: voiceIntegrations.status,
          })
          .from(voiceIntegrations)
          .where(eq(voiceIntegrations.businessId, businessId))
          .limit(5)
      : [];

    return payload(
      module,
      [
        metric("PayHere", business?.payhereEnabled ? "Enabled" : "Off", "Payments", business?.payhereEnabled ? "emerald" : "amber"),
        metric("Social", socialRows.length, "Connections", "cobalt"),
        metric("Voice AI", voiceRolloutOpen ? voiceRows[0]?.status ?? "not_requested" : VOICE_RECEPTIONIST_ROLLOUT.statusLabel, "Receptionist", "slate"),
        metric("Active", socialRows.filter((row) => row.isActive).length, "Social accounts", "emerald"),
      ],
      [
        ...socialRows.map((row) => item({
          id: row.id,
          status: row.isActive ? "active" : "inactive",
          subtitle: row.accountName ?? "No account name",
          title: row.provider,
        })),
        ...voiceRows.map((row) => item({
          id: row.id,
          status: row.status,
          subtitle: "Voice receptionist",
          title: row.providerName,
        })),
      ],
    );
  }

  if (module === "automations") {
    const rows = await db
      .select({
        createdAt: automationRules.createdAt,
        delayMinutes: automationRules.delayMinutes,
        id: automationRules.id,
        isActive: automationRules.isActive,
        name: automationRules.name,
        trigger: automationRules.trigger,
      })
      .from(automationRules)
      .where(eq(automationRules.businessId, businessId))
      .orderBy(desc(automationRules.createdAt))
      .limit(40);

    return payload(
      module,
      [
        metric("Rules", rows.length, "Configured", "cobalt"),
        metric("Active", rows.filter((row) => row.isActive).length, "Enabled", "emerald"),
        metric("Paused", rows.filter((row) => !row.isActive).length, "Disabled", "amber"),
        metric("Instant", rows.filter((row) => row.delayMinutes === 0).length, "No delay", "slate"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.createdAt),
        status: row.isActive ? "active" : "paused",
        subtitle: `${row.trigger} · ${row.delayMinutes} min delay`,
        title: row.name,
      })),
    );
  }

  if (module === "billing") {
    const business = await getBusiness(businessId);
    const rows = await db
      .select({
        amountLkr: subscriptions.amountLkr,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        id: subscriptions.id,
        interval: subscriptions.billingInterval,
        plan: subscriptions.plan,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(eq(subscriptions.businessId, businessId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(10);

    return payload(
      module,
      [
        metric("Plan", business?.plan ?? "expired", "Business tier", "cobalt"),
        metric("Subscriptions", rows.length, "Billing records", "slate"),
        metric("Active", rows.filter((row) => row.status === "active").length, "Current", "emerald"),
        metric("Past due", rows.filter((row) => row.status === "past_due").length, "Needs attention", "amber"),
      ],
      rows.map((row) => item({
        id: row.id,
        meta: dateText(row.currentPeriodEnd),
        status: row.status,
        subtitle: `${row.interval} · ${moneyLkr(row.amountLkr)}`,
        title: row.plan,
      })),
    );
  }

  const business = await getBusiness(businessId);
  const keyRows = await db
    .select({
      createdAt: apiKeys.createdAt,
      deviceName: apiKeys.deviceName,
      id: apiKeys.id,
      keyType: apiKeys.keyType,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    // Include mobile device keys alongside desktop keys so the Android fleet
    // is visible in the same settings module.
    .where(and(eq(apiKeys.businessId, businessId), inArray(apiKeys.keyType, ["desktop", "mobile"])))
    .orderBy(desc(apiKeys.createdAt))
    .limit(20);

  return payload(
    "settings",
    [
      metric("Business", business?.name ?? "Dinaya", "Profile", "cobalt"),
      metric("Plan", business?.plan ?? "expired", "Current tier", "slate"),
      metric("Desktop keys", keyRows.length, "Devices", "emerald"),
      metric("Revoked", keyRows.filter((row) => row.revokedAt).length, "Desktop keys", "amber"),
    ],
    keyRows.map((row) => item({
      id: row.id,
      meta: row.lastUsedAt ? `Last used ${dateText(row.lastUsedAt)}` : dateText(row.createdAt),
      status: row.revokedAt ? "revoked" : "active",
      subtitle: row.keyType,
      title: row.deviceName ?? "Dinaya Desktop",
    })),
  );
}
