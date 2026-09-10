import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dashboardRoutes, typedDashboardRouteGroups } from "@/lib/dashboard-route-map";

function readWorkspace(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function kotlinUiSources(): string[] {
  const dir = resolve(process.cwd(), "apps/mobile/app/src/main/java/lk/dinaya/mobile/ui");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".kt"))
    .map((name) => readFileSync(join(dir, name), "utf8"));
}

function kotlinSectionBlocks(source: string): Array<{
  desktopModule: string | null;
  key: string;
  label: string;
  webPath: string;
}> {
  const listBody = source.split("val mobileDashboardSections = listOf(")[1];
  if (!listBody) {
    throw new Error("Could not find mobileDashboardSections list");
  }
  return [...listBody.matchAll(
    /MobileDashboardSection\(\s*key = "([^"]+)",\s*label = "([^"]+)",\s*group = MobileDashboardGroup\.\w+,\s*desktopModule = ([^,]+),\s*webPath = "([^"]+)",/g,
  )].map((match) => ({
    key: match[1],
    label: match[2],
    desktopModule: match[3].trim() === "null" ? null : match[3].trim().replace(/^"|"$/g, ""),
    webPath: match[4],
  }));
}

function kotlinBottomTabs(source: string): Array<{ key: string; label: string }> {
  const match = /private val BottomPrimary = listOf\(([\s\S]*?)\n\)/.exec(source);
  if (!match) throw new Error("Could not find BottomPrimary tabs in DinayaMobileApp.kt");
  return [...match[1].matchAll(/BottomTab\("([^"]+)", "([^"]+)"/g)].map((row) => ({
    key: row[1],
    label: row[2],
  }));
}

function webBottomPrimary(source: string): Array<{ href: string; key: string; label: string }> {
  const match = /const PRIMARY: BottomNavItem\[] = \[([\s\S]*?)\];/.exec(source);
  if (!match) throw new Error("Could not find PRIMARY bottom nav items");
  return [...match[1].matchAll(/href: "([^"]+)", label: "([^"]+)"[\s\S]*?routeId: "([^"]+)"/g)].map((row) => ({
    href: row[1],
    label: row[2],
    key: row[3],
  }));
}

/** Clickable controls under 44dp, ignoring spacers and the 2dp tab indicator. */
function undersizedInteractiveHeights(source: string): Array<{ height: number; line: number }> {
  const lines = source.split("\n");
  const hits: Array<{ height: number; line: number }> = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.includes("Spacer(") || line.includes("tabIconScale") || line.includes("indicator")) {
      continue;
    }
    const heightMatch = /\.height\((\d+)\.dp\)/.exec(line);
    if (!heightMatch) continue;
    const height = Number(heightMatch[1]);
    if (height >= 44 || height <= 8) continue;
    const window = lines.slice(Math.max(0, index - 14), index + 1).join("\n");
    if (/onClick\s*=/.test(window) || /clickable\(/.test(window) || /\bButton\(/.test(window) || /\bOutlinedButton\(/.test(window)) {
      hits.push({ height, line: index + 1 });
    }
  }
  return hits;
}

describe("Android merchant shell vs web dashboard", () => {
  const sectionsKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/ui/DashboardSections.kt");
  const appKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/ui/DinayaMobileApp.kt");
  const themeKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/ui/DinayaTheme.kt");
  const clientKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/data/DinayaApiClient.kt");
  const envKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/data/DeviceEnvironment.kt");
  const viewModelKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/ui/DinayaViewModel.kt");
  const globalsCss = readWorkspace("src/app/globals.css");
  const bottomNavTsx = readWorkspace("src/components/dashboard/DashboardBottomNav.tsx");
  const signInTsx = readWorkspace("src/app/auth/signin/page.tsx");
  const sections = kotlinSectionBlocks(sectionsKt);

  it("covers every dashboard nav route id, label, and href", () => {
    expect(sections.map((section) => section.key).sort()).toEqual(
      dashboardRoutes.map((route) => route.id).sort(),
    );

    for (const route of dashboardRoutes) {
      const section = sections.find((item) => item.key === route.id);
      expect(section, `missing Android section for ${route.id}`).toBeDefined();
      expect(section?.label).toBe(route.label);
      expect(section?.webPath).toBe(route.href);
    }
  });

  it("uses the same More-sheet group names as the web dashboard", () => {
    const enumBody = /enum class MobileDashboardGroup\(val label: String\) \{([\s\S]*?)\}/.exec(sectionsKt)?.[1] ?? "";
    const androidGroupLabels = [...enumBody.matchAll(/^\s+\w+\("([^"]+)"\)/gm)].map((row) => row[1]);
    expect(androidGroupLabels).toEqual(typedDashboardRouteGroups.map((group) => group.label));
  });

  it("matches the web phone bottom nav: Home, Calendar, Bookings, Clients, plus More", () => {
    const tabs = kotlinBottomTabs(appKt);
    const webTabs = webBottomPrimary(bottomNavTsx);
    expect(tabs).toEqual(webTabs.map((tab) => ({ key: tab.key, label: tab.label })));
    expect(appKt).toContain('label = "More"');
    expect(bottomNavTsx).toContain(">More</span>");
  });

  it("mirrors the site cobalt primary token", () => {
    expect(globalsCss).toContain("--primary: 220 82% 53%");
    expect(themeKt).toContain("val DinayaPrimary = Color(0xFF2563EB)");
  });

  it("ships Cal Sans for headings and Inter for body, matching the site type stack", () => {
    const fontDir = resolve(process.cwd(), "apps/mobile/app/src/main/res/font");
    expect(existsSync(join(fontDir, "cal_sans_semibold.ttf"))).toBe(true);
    expect(existsSync(join(fontDir, "inter_regular.ttf"))).toBe(true);
    expect(existsSync(join(fontDir, "inter_medium.ttf"))).toBe(true);
    expect(existsSync(join(fontDir, "inter_semibold.ttf"))).toBe(true);
    expect(existsSync(join(fontDir, "inter_bold.ttf"))).toBe(true);
    expect(themeKt).toContain("val DinayaCalSans");
    expect(themeKt).toContain("val DinayaInter");
    expect(themeKt).toContain("R.font.cal_sans_semibold");
    expect(themeKt).toContain("R.font.inter_regular");
    expect(themeKt).toContain("headlineMedium = calStyle");
    expect(themeKt).toContain("bodyLarge = calStyle");
    expect(themeKt).toContain("bodyMedium = interStyle");
    expect(themeKt).toContain("val DinayaFieldTextStyle");
    expect(appKt).toContain("fontFamily = DinayaCalSans");
    expect(readWorkspace("apps/mobile/app/src/main/res/values/styles.xml")).toContain(
      "@font/cal_sans_semibold",
    );
    const fieldSources = kotlinUiSources().join("\n");
    const fieldBlocks = fieldSources.split("OutlinedTextField(").slice(1);
    expect(fieldBlocks.length).toBeGreaterThan(0);
    for (const block of fieldBlocks) {
      expect(block).toContain("DinayaFieldTextStyle");
    }
  });

  it("keeps cancelled bookings slate, matching dashboard-status.ts", () => {
    expect(themeKt).toContain("cancelled");
    expect(themeKt).toContain("Color(0xFFF1F5F9)");
    expect(themeKt).toContain("Color(0xFF334155)");
  });

  it("keeps native write paths that the Android client posts to", () => {
    const required = [
      "src/app/api/v1/mobile/bookings/route.ts",
      "src/app/api/v1/mobile/bookings/[id]/route.ts",
      "src/app/api/v1/mobile/bookings/[id]/cancel/route.ts",
      "src/app/api/v1/mobile/clients/route.ts",
      "src/app/api/v1/mobile/services/route.ts",
      "src/app/api/v1/mobile/staff/route.ts",
      "src/app/api/v1/mobile/locations/route.ts",
      "src/app/api/v1/mobile/deals/route.ts",
      "src/app/api/v1/mobile/broadcasts/route.ts",
      "src/app/api/v1/mobile/broadcasts/[id]/trigger/route.ts",
      "src/app/api/v1/mobile/availability/route.ts",
      "src/app/api/v1/mobile/settings/route.ts",
    ];
    for (const relativePath of required) {
      expect(existsSync(resolve(process.cwd(), relativePath)), relativePath).toBe(true);
    }

    expect(clientKt).toContain('path = mobilePath("deals")');
    expect(clientKt).toContain('path = mobilePath("broadcasts")');
    expect(clientKt).toContain('path = mobilePath("bookings/$bookingId")');
  });

  it("can load every Android desktopModule via a dedicated or catch-all mobile route", () => {
    const wildcard = resolve(process.cwd(), "src/app/api/v1/mobile/[module]/route.ts");
    expect(existsSync(wildcard)).toBe(true);
    expect(clientKt).toContain("fun mobileModulePath");
    for (const section of sections) {
      if (!section.desktopModule) continue;
      const dedicated = resolve(
        process.cwd(),
        "src/app/api/v1/mobile",
        section.desktopModule,
        "route.ts",
      );
      expect(
        existsSync(dedicated) || existsSync(wildcard),
        `${section.key} → ${section.desktopModule}`,
      ).toBe(true);
    }
  });

  it("keeps interactive Compose controls at least 44dp tall", () => {
    const violations = kotlinUiSources().flatMap((source, sourceIndex) =>
      undersizedInteractiveHeights(source).map((hit) => ({ ...hit, sourceIndex })),
    );
    expect(violations).toEqual([]);
  });

  it("uses the same sign-in heading, helper, and account CTA as the web form", () => {
    expect(signInTsx).toContain("Welcome back");
    expect(signInTsx).toContain("Sign in to your Dinaya dashboard");
    expect(signInTsx).toContain("Forgot password?");
    expect(signInTsx).toContain("Create your booking page");
    expect(appKt).toContain("Welcome back");
    expect(appKt).toContain("Sign in to your Dinaya dashboard");
    expect(appKt).toContain("Forgot password?");
    expect(appKt).toContain("Create your booking page");
    expect(appKt).toContain("/forgot-password");
    expect(appKt).toContain("/register");
  });

  it("hides Instant Demo Login on physical phones, even in debug APKs", () => {
    expect(appKt).toContain("showDeveloperSignInTools()");
    expect(appKt).toContain("Instant Demo Login");
    expect(envKt).toContain("fun defaultApiBaseUrl");
    expect(envKt).toContain("isEmulatorDevice");
    expect(viewModelKt).toContain("defaultApiBaseUrl()");
    expect(viewModelKt.includes("if (BuildConfig.DEBUG) \"http://127.0.0.1:3002\"")).toBe(false);
  });

  it("keeps native review publish, AI reply, and settings policy writes", () => {
    expect(existsSync(resolve(process.cwd(), "src/app/api/v1/desktop/reviews/[id]/generate-reply/route.ts"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "src/app/api/v1/mobile/reviews/[id]/generate-reply/route.ts"))).toBe(true);
    expect(viewModelKt).toContain("fun setReviewPublished");
    expect(viewModelKt).toContain("fun generateReviewReply");
    expect(clientKt).toContain("fun patchReviewPublished");
    expect(clientKt).toContain("fun generateReviewReply");
    expect(clientKt).toContain("cancellationPolicy");
    expect(clientKt).toContain("depositPolicy");
    expect(appKt).toContain("/dashboard/booking-page");
    expect(appKt).toContain("/dashboard/settings/api-keys");
    expect(appKt).toContain("/dashboard/settings/webhooks");
    expect(appKt).toContain("/dashboard/settings/voice-receptionist");
    expect(appKt).toContain("Export CSV");
  });

  it("uses capsule buttons, rounded chrome, and glass only on navigation", () => {
    const glassKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/ui/DinayaGlass.kt");
    expect(themeKt).toContain("val DinayaRadiusButton = RoundedCornerShape(999.dp)");
    expect(themeKt).toContain("val DinayaRadiusField = RoundedCornerShape(20.dp)");
    expect(themeKt).toContain("val DinayaRadiusCard = RoundedCornerShape(24.dp)");
    expect(themeKt).toContain("val DinayaRadiusChrome = RoundedCornerShape(32.dp)");
    expect(themeKt).toContain("shapes = DinayaShapes");
    expect(glassKt).toContain("fun Modifier.dinayaGlass");
    expect(glassKt).toContain("Do not use on content cards");
    expect(appKt).toContain("dinayaGlass(DinayaRadiusChrome");
    expect(appKt).toContain("dinayaGlass(DinayaRadiusPill, dark)");
    expect(appKt).not.toContain("RoundedCornerShape(8.dp)");
    expect(appKt).not.toContain("RoundedCornerShape(12.dp)");
    expect(appKt).not.toContain("RoundedCornerShape(14.dp)");
  });

  it("uses keep-alive, no-bounce springs, press scale, and reduced motion", () => {
    const motionKt = readWorkspace("apps/mobile/app/src/main/java/lk/dinaya/mobile/ui/DinayaMotion.kt");
    expect(clientKt).toContain("keep-alive");
    expect(clientKt).toContain("useCaches = true");
    expect(themeKt).toContain("LocalReduceMotion");
    expect(motionKt).toContain("0.96f");
    expect(motionKt).toContain("DampingRatioNoBouncy");
    expect(appKt).toContain("dinayaSectionEnter");
    expect(appKt).toContain("BookingListSkeleton");
  });
});
