"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { BookOpen, LogOut, Search, ShieldCheck, UserCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardToastProvider } from "@/components/dashboard/ToastProvider";
import { useDashboardNavigationOptional } from "@/components/dashboard/DashboardNavigation";
import { useDashboardCopy, useDashboardRole } from "@/components/dashboard/DashboardLocaleProvider";
import { DashboardBottomNav } from "@/components/dashboard/DashboardBottomNav";
import {
  DashboardCommandMenu,
} from "@/components/dashboard/DashboardCommandMenu";
import { MacOSSidebar } from "@/components/ui/macos-sidebar";
import { dashboardNavGroups } from "@/lib/dashboard-nav";
import type { DashboardCopy } from "@/lib/dashboard-i18n";
import type { PlanUsage } from "@/lib/dashboard-usage";
import { formatPlanUsage, isNearPlanLimit } from "@/lib/dashboard-usage";
import { planDisplayName } from "@/lib/plan-display";
import { trackDashboardNavClick } from "@/lib/analytics/gtag";
import { cn } from "@/lib/utils";
import {
  dashboardChromeClass,
  dashboardMainCanvasClass,
  dashboardShellCanvasClass,
  shouldShowPlanBanner,
} from "@/lib/dashboard-ui";

type DashboardShellProps = {
  businessName: string;
  userEmail: string;
  userName: string | null;
  plan: string;
  trialDaysLeft?: number | null;
  showAdminLink: boolean;
  readOnlyImpersonation: boolean;
  impersonatedBy?: string;
  planUsage?: PlanUsage;
  copy: DashboardCopy;
  minimalChrome?: boolean;
  banner?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardShell({
  businessName,
  userEmail,
  userName,
  plan,
  trialDaysLeft,
  showAdminLink,
  readOnlyImpersonation,
  impersonatedBy,
  planUsage,
  copy,
  minimalChrome = false,
  banner,
  children,
}: DashboardShellProps) {
  const navigation = useDashboardNavigationOptional();
  const pathname = usePathname();
  const activeHref = navigation?.activeHref ?? pathname;
  const navCopy = useDashboardCopy();
  const role = useDashboardRole();
  const isOwner = role === "owner";
  const isSetupFlow = minimalChrome || activeHref.startsWith("/dashboard/setup");
  const [commandOpen, setCommandOpen] = useState(false);
  const [tabletCollapsedDefault] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches
      ? false
      : true;
  });

  const openCommand = useCallback(() => setCommandOpen(true), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCommand]);

  if (isSetupFlow) {
    return (
      <DashboardToastProvider>
        {children}
      </DashboardToastProvider>
    );
  }

  const primaryHrefs = new Set([
    "/dashboard",
    "/dashboard/calendar",
    "/dashboard/bookings",
    "/dashboard/clients",
  ]);

  const sections = dashboardNavGroups
    .map((group) => {
      const items = group.links
        .filter((link) => isOwner || !link.ownerOnly)
        .map((link) => {
          const Icon = link.icon;
          return {
            href: link.href,
            exact: link.exact,
            label: navCopy.nav[link.labelKey],
            routeId: link.labelKey,
            Icon,
            icon: <Icon className="size-4" aria-hidden="true" />,
          };
        });

      if (items.length === 0) return null;

      return {
        label: navCopy.navGroups[group.labelKey],
        items,
      };
    })
    .filter((section): section is NonNullable<typeof section> => section !== null);

  const moreSections = sections
    .map((section) => ({
      label: section.label,
      items: section.items
        .filter((item) => !primaryHrefs.has(item.href))
        .map((item) => ({
          href: item.href,
          label: item.label,
          icon: item.Icon,
          exact: item.exact,
          routeId: item.routeId,
        })),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarSections = sections.map((section) => ({
    label: section.label,
    items: section.items.map((item) => ({
      href: item.href,
      label: item.label,
      exact: item.exact,
      icon: item.icon,
    })),
  }));

  const usageLines = planUsage
    ? [
        { label: "Services", value: formatPlanUsage(planUsage.services) },
        { label: "Staff", value: formatPlanUsage(planUsage.staff) },
        { label: "Locations", value: formatPlanUsage(planUsage.locations) },
      ].filter((item) => item.value !== null)
    : [];

  const planLabel = planDisplayName(plan);
  const handleSignOut = () => {
    if (navigation?.signOut) {
      navigation.signOut();
      return;
    }
    void signOut({ redirectTo: "/auth/signin" });
  };

  const accountFooter = (
    <div className="space-y-3 border-t border-border/70 px-2 pt-3">
      <Link
        href="/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
      >
        <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
        Help &amp; docs
      </Link>
      {showAdminLink ? (
        <Link
          href="/admin"
          className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-2 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {copy.layout.platformAdmin}
        </Link>
      ) : null}
      <div className="px-1">
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          {planLabel} {copy.layout.planSuffix}
        </p>
        {usageLines.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {usageLines.map((line) => {
              const usageItem =
                line.label === "Services"
                  ? planUsage!.services
                  : line.label === "Staff"
                    ? planUsage!.staff
                    : planUsage!.locations;
              const pct =
                usageItem.limit != null && usageItem.limit > 0
                  ? Math.min(100, Math.round((usageItem.used / usageItem.limit) * 100))
                  : 0;
              return (
                <div key={line.label} className="space-y-1">
                  <p
                    className={cn(
                      "text-[0.68rem] text-muted-foreground",
                      isNearPlanLimit(usageItem) && "font-medium text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {line.label}: {line.value}
                  </p>
                  {usageItem.limit != null && usageItem.limit > 0 ? (
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isNearPlanLimit(usageItem) ? "bg-amber-500" : "bg-primary",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex min-h-11 w-full items-center rounded-xl px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copy.layout.signOut}
      </button>
    </div>
  );

  const collapsedAccountFooter = (
    <button
      type="button"
      onClick={handleSignOut}
      aria-label={copy.layout.signOut}
      className="mx-auto flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <LogOut className="size-4" aria-hidden="true" />
    </button>
  );

  return (
    <div className={cn("flex h-dvh flex-col overflow-hidden", dashboardShellCanvasClass)}>
      {readOnlyImpersonation ? (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Read-only impersonation session
          {impersonatedBy ? ` (admin: ${impersonatedBy})` : ""}. Mutations are blocked.
        </div>
      ) : null}

      {shouldShowPlanBanner(activeHref, plan) && plan === "trial" ? (
        <Link
          href="/dashboard/billing"
          className="flex min-h-11 shrink-0 items-center justify-center border-b border-primary/25 bg-primary/5 px-4 py-2.5 text-center text-sm text-primary transition-colors hover:bg-primary/10"
        >
          {trialDaysLeft != null && trialDaysLeft > 0
            ? `${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left in your free trial`
            : "Your free trial ends today"}
          {" — subscribe to keep your booking page live →"}
        </Link>
      ) : null}

      {shouldShowPlanBanner(activeHref, plan) && plan === "expired" ? (
        <Link
          href="/dashboard/billing"
          className="flex min-h-11 shrink-0 items-center justify-center border-b border-red-500/30 bg-red-50 px-4 py-2.5 text-center text-sm font-medium text-red-900 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
        >
          Your free trial has ended — your booking page is offline. Reactivate by subscribing →
        </Link>
      ) : null}

      <div data-dashboard-shell-inert className="flex min-h-0 flex-1 flex-col">
        <MacOSSidebar
          activeHref={activeHref}
          sections={sidebarSections}
          className="min-h-0 flex-1"
          header={
            <div className="min-w-0 space-y-0.5">
              <Logo href={navigation ? null : "/dashboard"} size="sm" />
              <p className="truncate px-0.5 text-xs font-medium text-muted-foreground">
                {businessName}
              </p>
            </div>
          }
          footer={accountFooter}
          collapsedFooter={collapsedAccountFooter}
          defaultOpen={tabletCollapsedDefault}
          onItemSelect={
            navigation?.navigate
              ? (href) => {
                  trackDashboardNavClick({ href, surface: "sidebar" });
                  navigation.navigate?.(href);
                }
              : undefined
          }
        >
          <header className={cn("sticky top-0 z-20 border-b", dashboardChromeClass)}>
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={openCommand}
                  className="flex h-11 w-full items-center gap-2 rounded-xl border border-black/[0.06] bg-[hsl(var(--dashboard-main))] px-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground dark:border-white/10"
                >
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{copy.layout.searchPlaceholder}</span>
                  <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] sm:inline">
                    ⌘K
                  </kbd>
                </button>
                {/* Keep a real form for desktop-app search wiring */}
                {navigation?.onSearchSubmit ? (
                  <form
                    className="sr-only"
                    onSubmit={(event) => {
                      event.preventDefault();
                      navigation.onSearchSubmit?.();
                    }}
                  >
                    <input
                      name="q"
                      type="search"
                      value={navigation.searchQuery ?? ""}
                      onChange={(event) =>
                        navigation.onSearchQueryChange?.(event.target.value)
                      }
                    />
                  </form>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <div className="hidden size-9 items-center justify-center rounded-full bg-muted sm:flex" title={userName ?? userEmail}>
                  <UserCircle className="size-5 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">{userName ?? userEmail}</span>
                </div>
              </div>
            </div>
          </header>

          {banner}

          <DashboardToastProvider>
            <main
              className={cn(
                "min-h-0 flex-1 overflow-auto pb-[calc(3.75rem+env(safe-area-inset-bottom)+0.75rem)] md:pb-0",
                dashboardMainCanvasClass,
              )}
            >
              <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
            </main>
          </DashboardToastProvider>
        </MacOSSidebar>
      </div>

      <DashboardCommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={
          navigation?.navigate
            ? (href) => {
                trackDashboardNavClick({ href, surface: "command" });
                navigation.navigate?.(href);
              }
            : undefined
        }
      />

      <DashboardBottomNav
        activeHref={activeHref}
        moreSections={moreSections}
        userEmail={userEmail}
        planLabel={`${planLabel} ${copy.layout.planSuffix}`.trim()}
        showAdminLink={showAdminLink}
        onSignOut={handleSignOut}
        onNavigate={(href) => navigation?.navigate?.(href)}
      />
    </div>
  );
}
