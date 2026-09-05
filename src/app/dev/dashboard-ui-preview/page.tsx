import { CalendarCheck, Banknote, Users, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardLocaleProvider } from "@/components/dashboard/DashboardLocaleProvider";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardCopyField } from "@/components/dashboard/DashboardCopyField";
import { DashboardStatGrid } from "@/components/dashboard/DashboardStatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getDashboardCopy } from "@/lib/dashboard-i18n";
import {
  dashboardOutlineActionClass,
  dashboardPageClass,
  dashboardPrimaryActionClass,
  dashboardSurfaceClass,
} from "@/lib/dashboard-ui";
import type { DashboardOverviewData } from "@/lib/dashboard/overview-data";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const mockOverview: DashboardOverviewData = {
  businessName: "Wax in the City",
  ownerName: "Amara",
  greetingDate: "Wednesday, 22 Jul",
  showStats: true,
  showOnboarding: false,
  showShareCard: true,
  onboarding: [],
  bookingUrl: "https://wax.dinaya.lk",
  bookingDisplayUrl: "wax.dinaya.lk",
  whatsappShare: "https://wa.me/?text=Book%20online",
  embedSnippet:
    '<iframe src="https://dinaya.lk/embed/book/wax?embed=1" width="100%" height="720"></iframe>',
  stats: [
    { label: "Today", value: 6, icon: CalendarCheck, tone: "cobalt", delta: "+2 vs yesterday" },
    { label: "Revenue", value: "LKR 28,500", icon: Banknote, tone: "amber", delta: "+12%" },
    { label: "New clients", value: 3, icon: Users, tone: "violet" },
    { label: "Completion", value: "94%", icon: TrendingUp, tone: "slate", delta: "+4%" },
  ],
  todayRows: [
    {
      id: "1",
      clientName: "Nimali Perera",
      clientPhone: "+94771234567",
      serviceName: "Full legs",
      staffName: "Anya",
      startsAt: new Date("2026-07-22T09:30:00.000Z"),
      status: "confirmed",
    },
    {
      id: "2",
      clientName: "Sahan Jay",
      clientPhone: "+94772345678",
      serviceName: "Beard trim",
      staffName: "Kasun",
      startsAt: new Date("2026-07-22T11:00:00.000Z"),
      status: "pending",
    },
    {
      id: "3",
      clientName: "Ishara Fonseka",
      clientPhone: "+94773456789",
      serviceName: "Brow shape",
      staffName: "Anya",
      startsAt: new Date("2026-07-22T13:00:00.000Z"),
      status: "completed",
    },
  ],
  nextRows: [],
  recentActivity: [
    { action: "created", createdAt: new Date(Date.now() - 1000 * 60 * 12), entity: "booking" },
    { action: "completed", createdAt: new Date(Date.now() - 1000 * 60 * 45), entity: "booking" },
    { action: "created", createdAt: new Date(Date.now() - 1000 * 60 * 90), entity: "client" },
  ],
};

type PreviewProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function DashboardUiPreviewPage({ searchParams }: PreviewProps) {
  const { view = "overview" } = await searchParams;
  const copy = getDashboardCopy("en");

  return (
    <DashboardLocaleProvider language="en" role="owner">
      <DashboardShell
        businessName="Wax in the City"
        userEmail="owner@wax.lk"
        userName="Anya"
        plan="pro"
        showAdminLink={false}
        readOnlyImpersonation={false}
        planUsage={{
          services: { used: 8, limit: 50 },
          staff: { used: 3, limit: 5 },
          locations: { used: 1, limit: 1 },
        }}
        copy={copy}
      >
        {view === "clients" ? (
          <div className={dashboardPageClass} data-preview="clients">
            <DashboardPageHeader
              size="lg"
              title="Clients"
              description="Manage your customer list, track leads, and grow your business."
              actions={
                <>
                  <button type="button" className={dashboardOutlineActionClass}>
                    Export CSV
                  </button>
                  <Link href="#" className={dashboardPrimaryActionClass}>
                    Add customer
                  </Link>
                </>
              }
            />
            <DashboardStatGrid>
              <StatCard label="Total customers" value={128} icon={Users} />
              <StatCard label="Active" value={86} icon={Users} />
              <StatCard label="Leads" value={24} icon={Users} />
              <StatCard label="Prospects" value={18} icon={TrendingUp} />
            </DashboardStatGrid>
            <DashboardSection title="Pipeline">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="confirmed" />
                <StatusBadge status="pending" />
                <StatusBadge status="completed" />
                <StatusBadge status="no_show" />
                <StatusBadge status="cancelled" />
              </div>
              <div className="mt-4">
                <EmptyState
                  icon={Users}
                  title="No matches"
                  description="Empty states use the shared dashed card + Cal Sans title."
                  action={
                    <span className={dashboardPrimaryActionClass}>Add your first customer</span>
                  }
                />
              </div>
            </DashboardSection>
          </div>
        ) : view === "marketing" ? (
          <div className={dashboardPageClass} data-preview="marketing">
            <DashboardPageHeader
              title="Marketing"
              description="Share your booking page across WhatsApp, Instagram, posters, and your website."
              actions={
                <Link href="#" className={dashboardPrimaryActionClass}>
                  Edit booking page
                </Link>
              }
            />
            <section className={cn(dashboardSurfaceClass, "p-5")}>
              <h2 className="font-cal text-lg tracking-tight">Share</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                One link for Instagram, WhatsApp, and your site.
              </p>
              <code className="mt-4 block truncate rounded-xl bg-muted/60 px-3 py-3 font-mono text-sm">
                https://wax.dinaya.lk
              </code>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={dashboardPrimaryActionClass}>WhatsApp share</span>
                <span className={dashboardOutlineActionClass}>Open page</span>
              </div>
            </section>
            <DashboardSection title="Website embeds">
              <DashboardCopyField
                label="Book now modal button"
                value={`<script src="https://dinaya.lk/embed.js"></script>\n<button onclick="DinayaEmbed.modal({ slug: 'wax' })">Book now</button>`}
                rows={4}
              />
            </DashboardSection>
          </div>
        ) : (
          <div data-preview="overview">
            <DashboardOverview data={mockOverview} />
          </div>
        )}
      </DashboardShell>
    </DashboardLocaleProvider>
  );
}
