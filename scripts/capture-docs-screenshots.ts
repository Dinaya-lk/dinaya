/**
 * Captures documentation screenshots.
 *
 * Live mode (real dashboard + booking — requires DATABASE_URL + running app):
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 DOCS_CAPTURE_MODE=live npx tsx scripts/capture-docs-screenshots.ts
 *
 * Preview mode (mockup frames — no database):
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 DOCS_CAPTURE_MODE=preview npx tsx scripts/capture-docs-screenshots.ts
 */

import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DOCS_PREVIEW_MOCKUP_IDS } from "../src/lib/docs/visuals";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const outDir = path.join(process.cwd(), "public/docs/screenshots");
const mode = process.env.DOCS_CAPTURE_MODE ?? "live";
/** Comma-separated screenshot names, e.g. `dashboard-overview,dashboard-marketing`. */
const onlyNames = new Set(
  (process.env.DOCS_CAPTURE_ONLY ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

type LiveTarget = {
  name: string;
  path: string;
  /** Text that indicates the page finished loading (not a skeleton). */
  ready: RegExp;
};

const liveTargets: LiveTarget[] = [
  { name: "dashboard-overview", path: "/dashboard", ready: /Good day|Today|New booking/i },
  { name: "dashboard-onboarding", path: "/dashboard/setup", ready: /setup|YOUR BOOKING PAGE|Business name|already complete/i },
  { name: "dashboard-bookings", path: "/dashboard/bookings", ready: /Bookings/i },
  { name: "dashboard-services", path: "/dashboard/services", ready: /Services|Add service/i },
  { name: "dashboard-staff", path: "/dashboard/staff", ready: /Staff|Add staff/i },
  { name: "dashboard-locations", path: "/dashboard/locations", ready: /Locations|branch/i },
  { name: "dashboard-availability", path: "/dashboard/availability", ready: /Availability|Weekly/i },
  { name: "dashboard-calendar", path: "/dashboard/calendar", ready: /Calendar/i },
  { name: "dashboard-clients", path: "/dashboard/clients", ready: /Clients/i },
  { name: "dashboard-reviews", path: "/dashboard/reviews", ready: /Reviews|Upgrade/i },
  { name: "dashboard-payments", path: "/dashboard/payments", ready: /Payments|Upgrade/i },
  { name: "dashboard-marketing", path: "/dashboard/marketing", ready: /Marketing|booking link|dinaya\.lk/i },
  { name: "dashboard-deals", path: "/dashboard/deals", ready: /Deals|Upgrade/i },
  { name: "dashboard-settings", path: "/dashboard/settings", ready: /Settings|Business profile/i },
  { name: "dashboard-integrations", path: "/dashboard/settings/integrations", ready: /Integrations|Google|Connect/i },
  { name: "dashboard-billing", path: "/dashboard/billing", ready: /Billing|Plan|Upgrade/i },
  { name: "dashboard-reports", path: "/dashboard/reports", ready: /Reports|Analytics|Upgrade/i },
  { name: "dashboard-ai", path: "/dashboard/ai", ready: /AI|Upgrade|Growth/i },
  { name: "dashboard-automations", path: "/dashboard/automations", ready: /Automations|Upgrade/i },
];

async function registerDemoAccount(): Promise<{
  email: string;
  password: string;
  slug: string;
}> {
  const suffix = Date.now();
  const email = `docs-demo-${suffix}@dinaya.test`;
  const password = "DocsDemo123!";
  const slug = `docs-demo-${suffix}`;
  const res = await fetch(`${baseURL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Dilini Perera",
      email,
      password,
      businessName: "Dilini's Studio",
      slug,
      businessType: "salon_barber",
      language: "en",
    }),
  });
  if (!res.ok) {
    throw new Error(`Register failed: ${await res.text()}`);
  }
  return { email, password, slug };
}

function runScript(args: string[]) {
  // `npx` resolves to npx.cmd on Windows — spawnSync can't exec it directly
  // without shell:true, which made every seed step here silently no-op
  // (status: null) on Windows while looking like a normal exit.
  const result = spawnSync("npx", ["tsx", ...args], {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.warn(`Seed warning: ${args.join(" ")} failed to spawn: ${result.error.message}`);
  } else if (result.status !== 0) {
    console.warn(`Seed warning: ${args.join(" ")} exited ${result.status}`);
  }
}

function seedDemoBusiness(slug: string) {
  runScript(["scripts/seed-test-services.ts", slug, "--count", "6"]);
  runScript(["scripts/seed-test-availability.ts", slug]);
  runScript(["scripts/seed-test-staff.ts", slug]);
}

function completeOnboarding(email: string) {
  runScript(["scripts/docs-complete-onboarding.ts", email]);
}

async function hideDevChrome(page: Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-next-badge-root],
      [data-nextjs-toast],
      #__next-build-watcher,
      [aria-label="Open Next.js Dev Tools"] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  }).catch(() => undefined);

  await page.evaluate(() => {
    document.querySelectorAll('a[href="/dashboard/billing"]').forEach((node) => {
      const text = node.textContent ?? "";
      if (/trial|subscribe|booking page is offline/i.test(text)) {
        (node as HTMLElement).style.display = "none";
      }
    });

    const rewrite = (value: string) =>
      value
        .replace(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/gi, "https://dilini.dinaya.lk")
        .replace(/(?:localhost|127\.0\.0\.1):\d+/gi, "dilini.dinaya.lk")
        .replace(/docs-demo-\d+/gi, "dilini")
        .replace(/https:\/\/dilini\.dinaya\.lk\/book\/dilini/gi, "https://dilini.dinaya.lk");

    const scrubNode = (node: Element) => {
      const el = node as HTMLInputElement & HTMLAnchorElement & HTMLElement;
      if ("value" in el && typeof el.value === "string" && /localhost|127\.0\.0\.1|docs-demo-/i.test(el.value)) {
        const next = rewrite(el.value);
        el.value = next;
        el.setAttribute("value", next);
        // Freeze against React rehydration flashing localhost again.
        el.setAttribute("readonly", "true");
      }
      const href = el.getAttribute?.("href");
      if (href && /localhost|127\.0\.0\.1|docs-demo-/i.test(href)) {
        el.setAttribute("href", rewrite(href));
      }
      if (el.childElementCount === 0 && el.textContent && /localhost|127\.0\.0\.1|docs-demo-/i.test(el.textContent)) {
        el.textContent = rewrite(el.textContent);
      }
    };

    document.querySelectorAll("input, textarea, a[href], [href], code, span, p, button").forEach(scrubNode);

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const text of nodes) {
      if (text.nodeValue && /localhost|127\.0\.0\.1|docs-demo-/i.test(text.nodeValue)) {
        text.nodeValue = rewrite(text.nodeValue);
      }
    }

    // Never hide large layout ancestors — that blanks whole dashboard pages.
  }).catch(() => undefined);
}

async function settle(page: Page, ready?: RegExp) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await hideDevChrome(page);
  // Wait out Next.js streaming / skeleton chrome.
  await page
    .locator(".animate-pulse")
    .first()
    .waitFor({ state: "detached", timeout: 20_000 })
    .catch(() => undefined);
  if (ready) {
    try {
      await page.getByText(ready).first().waitFor({ state: "visible", timeout: 45_000 });
    } catch {
      console.warn(`Ready text not found (${ready}) — capturing anyway`);
    }
  }
  // Extra beat for client hydration after skeletons clear.
  await page.waitForTimeout(900);
  await hideDevChrome(page);
}

/** Scroll the active sidebar row into view so below-fold items (AI, Settings, …) appear in shots. */
async function scrollActiveNavIntoView(page: Page) {
  await page.evaluate(`(() => {
    var active = document.querySelector('aside [aria-current="page"]');
    var nav = document.querySelector('aside nav');
    if (!active || !nav) return;
    var top = active.offsetTop - nav.clientHeight / 2 + active.offsetHeight / 2;
    nav.scrollTop = Math.max(0, top);
    active.scrollIntoView({ block: "center", inline: "nearest" });
  })()`);
  await page.waitForTimeout(250);
}

async function freezeCleanDom(page: Page) {
  // String form avoids tsx injecting `__name` helpers into the browser context.
  // Clone body after scrub so React cannot rehydrate localhost into the shot.
  await page.evaluate(`(() => {
    function rewrite(value) {
      return String(value)
        .replace(/https?:\\/\\/(?:localhost|127\\.0\\.0\\.1):\\d+/gi, "https://dilini.dinaya.lk")
        .replace(/(?:localhost|127\\.0\\.0\\.1):\\d+/gi, "dilini.dinaya.lk")
        .replace(/docs-demo-\\d+/gi, "dilini")
        .replace(/https:\\/\\/dilini\\.dinaya\\.lk\\/book\\/dilini\\/?/gi, "https://dilini.dinaya.lk");
    }
    var clone = document.body.cloneNode(true);
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) {
      var text = nodes[i];
      if (text.nodeValue && /localhost|127\\.0\\.0\\.1|docs-demo-/i.test(text.nodeValue)) {
        text.nodeValue = rewrite(text.nodeValue);
      }
    }
    clone.querySelectorAll("input, textarea").forEach(function (node) {
      var el = node;
      var current = el.value || el.getAttribute("value") || "";
      if (/localhost|127\\.0\\.0\\.1|docs-demo-/i.test(current)) {
        var next = rewrite(current || "https://dilini.dinaya.lk");
        el.value = next.indexOf("http") === 0 ? next : "https://" + next;
        el.setAttribute("value", el.value);
      }
    });
    clone.querySelectorAll("[href]").forEach(function (node) {
      var href = node.getAttribute("href");
      if (href && /localhost|127\\.0\\.0\\.1|docs-demo-/i.test(href)) {
        node.setAttribute("href", rewrite(href));
      }
    });
    // Cloning can change flex/overflow math — re-scroll active nav on the clone.
    var activeLabel =
      (document.querySelector('aside [aria-current="page"]') &&
        document.querySelector('aside [aria-current="page"]').textContent) ||
      "";
    document.body.replaceWith(clone);
    var clonedNav = document.querySelector("aside nav");
    var clonedActive = document.querySelector('aside [aria-current="page"]');
    if (!clonedActive && activeLabel && clonedNav) {
      var spans = clonedNav.querySelectorAll("span");
      for (var s = 0; s < spans.length; s++) {
        if ((spans[s].textContent || "").trim() === activeLabel.trim()) {
          clonedActive = spans[s].closest("a, button") || spans[s];
          break;
        }
      }
    }
    if (clonedNav && clonedActive) {
      var top =
        clonedActive.offsetTop - clonedNav.clientHeight / 2 + clonedActive.offsetHeight / 2;
      clonedNav.scrollTop = Math.max(0, top);
      if (typeof clonedActive.scrollIntoView === "function") {
        clonedActive.scrollIntoView({ block: "center", inline: "nearest" });
      }
    }
  })()`);
}

async function screenshotPage(
  page: Page,
  name: string,
  opts: { freeze?: boolean } = {},
) {
  const freeze = opts.freeze !== false;
  await hideDevChrome(page);
  if (name.startsWith("dashboard-")) {
    await scrollActiveNavIntoView(page);
  }
  // freezeCleanDom replaces <body> — only use when no further interaction is needed.
  if (freeze) {
    await freezeCleanDom(page);
  }
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Saved ${file}`);
}

function cookieDomain(): string {
  const host = new URL(baseURL).hostname;
  return host === "localhost" ? "localhost" : host;
}

async function signInViaApi(page: Page, email: string, password: string) {
  console.log("Fetching CSRF token…");
  const csrfRes = await fetch(`${baseURL}/api/auth/csrf`);
  if (!csrfRes.ok) {
    throw new Error(`CSRF fetch failed (${csrfRes.status})`);
  }
  const setCookieHeaders = csrfRes.headers.getSetCookie?.() ?? [];
  const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfToken) {
    throw new Error("Missing CSRF token for sign-in");
  }

  const cookieJar = new Map<string, string>();
  for (const raw of setCookieHeaders) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }

  console.log("Posting credentials callback…");
  const body = new URLSearchParams({
    callbackUrl: "/dashboard",
    csrfToken,
    email,
    json: "true",
    password,
  });
  const res = await fetch(`${baseURL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body,
    redirect: "manual",
  });
  const status = res.status;
  if (status !== 200 && status !== 302) {
    throw new Error(`Login failed (${status}): ${await res.text()}`);
  }

  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }

  const session = cookieJar.get("authjs.session-token") ?? cookieJar.get("__Secure-authjs.session-token");
  if (!session) {
    throw new Error("Login did not set a session cookie");
  }

  const domain = cookieDomain();
  await page.context().addCookies(
    [...cookieJar.entries()].map(([name, value]) => ({
      name,
      value,
      domain,
      path: "/",
      httpOnly: true,
      secure: name.startsWith("__Secure-"),
      sameSite: "Lax" as const,
    })),
  );

  console.log("Opening dashboard with session cookie…");
  await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForURL("**/dashboard**", { timeout: 60_000 });
  console.log("Signed in via credentials API");
}

function shouldCapture(name: string) {
  return onlyNames.size === 0 || onlyNames.has(name);
}

async function captureLive(page: Page) {
  const account = await registerDemoAccount();
  console.log(`Registered demo business ${account.slug}`);
  seedDemoBusiness(account.slug);
  console.log("Seeding complete — signing in…");
  await signInViaApi(page, account.email, account.password);

  // Capture setup wizard before marking onboarding complete.
  const onboarding = liveTargets.find((t) => t.name === "dashboard-onboarding");
  if (onboarding && shouldCapture(onboarding.name)) {
    console.log(`Capturing ${onboarding.name} (${onboarding.path})`);
    await page.goto(`${baseURL}${onboarding.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await settle(page, onboarding.ready);
    await screenshotPage(page, onboarding.name);
  }

  completeOnboarding(account.email);
  // Refresh session page so shell chrome appears.
  await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await settle(page, /Good day|Today|New booking/i);

  for (const target of liveTargets) {
    if (target.name === "dashboard-onboarding") continue;
    if (!shouldCapture(target.name)) continue;
    console.log(`Capturing ${target.name} (${target.path})`);
    await page.goto(`${baseURL}${target.path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await settle(page, target.ready);
    if (target.name === "dashboard-marketing") {
      await page
        .getByText(/^Loading/i)
        .first()
        .waitFor({ state: "hidden", timeout: 20_000 })
        .catch(() => undefined);
      // Live preview iframe often stays blank in headless — drop it so the shot
      // focuses on Share + Directory (the guide-relevant controls).
      await page.evaluate(`(() => {
        document.querySelectorAll("iframe").forEach(function (iframe) {
          var title = (iframe.getAttribute("title") || "").toLowerCase();
          if (title.indexOf("preview") !== -1 || title.indexOf("booking") !== -1) {
            var node = iframe;
            for (var i = 0; i < 6 && node; i++) {
              if (node.tagName === "SECTION" || (node.className && String(node.className).indexOf("DashboardSection") !== -1)) {
                node.remove();
                return;
              }
              node = node.parentElement;
            }
            iframe.remove();
          }
        });
      })()`);
      await page.waitForTimeout(400);
      await hideDevChrome(page);
    }
    await screenshotPage(page, target.name);
  }

  // PayHere lives under Settings in the product UI.
  if (shouldCapture("dashboard-payhere") || shouldCapture("dashboard-settings")) {
    const settingsFile = path.join(outDir, "dashboard-settings.png");
    const payhereFile = path.join(outDir, "dashboard-payhere.png");
    if (fs.existsSync(settingsFile)) {
      fs.copyFileSync(settingsFile, payhereFile);
      console.log(`Saved ${payhereFile} (copy of dashboard-settings)`);
    }
  }

  const bookingNames = [
    "booking-service",
    "booking-time",
    "booking-confirm",
    "booking-manage",
    "booking-review",
  ];
  if (onlyNames.size === 0 || bookingNames.some((name) => onlyNames.has(name))) {
    await captureBookingFlow(page, account.slug);
  }
}

async function capturePreviewMockup(page: Page, mockupId: string) {
  // Use /dev/docs-preview — bare page without PublicNav / docs chrome.
  await page.goto(`${baseURL}/dev/docs-preview/${mockupId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-docs-capture-root]");
  await settle(page);
  const root = page.locator("[data-docs-capture-root]");
  const file = path.join(outDir, `${mockupId}.png`);
  await root.screenshot({ path: file });
  console.log(`Saved ${file} (preview mockup)`);
}

/**
 * Capture booking manage/review as bare screen content (no phone bezel).
 * DocsPhoneFrame adds the bezel in the guide UI — capturing a framed mockup
 * would nest phones. Bypass DocsMockupCapture's screenshot short-circuit.
 */
async function captureBookingScreenMockup(page: Page, mockupId: "booking-manage" | "booking-review") {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/dev/docs-preview/${mockupId}?screenOnly=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-docs-capture-root] [data-booking-theme]");
  await settle(page);
  const root = page.locator("[data-docs-capture-root]");
  const file = path.join(outDir, `${mockupId}.png`);
  await root.screenshot({ path: file });
  console.log(`Saved ${file} (booking screen mockup)`);
}

async function captureBookingFlow(page: Page, slug: string) {
  const bookingContext = page.context();
  const phone = await bookingContext.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });

  const bookBase = `${baseURL}/book/${slug}`;

  await phone.goto(bookBase, { waitUntil: "domcontentloaded" });
  await settle(phone, /Select a service|Choose a service|services/i);
  if (shouldCapture("booking-service")) {
    // Don't freeze — service cards are buttons and we still need to click through.
    await screenshotPage(phone, "booking-service", { freeze: false });
  }

  // Hub cards are <button>; deep-link fallback exists for some services.
  const serviceButton = phone
    .locator("button")
    .filter({ hasText: /LKR|Rs\.?/i })
    .first();
  const serviceLink = phone.locator(`a[href^="/book/${slug}/"]`).first();
  if ((await serviceButton.count()) > 0) {
    await serviceButton.click();
  } else if ((await serviceLink.count()) > 0) {
    await serviceLink.click();
  } else {
    throw new Error("No booking service control found for capture");
  }
  await phone
    .waitForURL(new RegExp(`/book/${slug}/[^/]+`), { timeout: 30_000 })
    .catch(() => undefined);
  await settle(phone, /time|date|staff|available|Pick|Continue|When|slot|Select a time|Pick a date/i);

  // Mobile booking times are inline now (no "Available times" sheet).
  // Click the sheet trigger if it still exists — harmless fallback for older layouts.
  const openSlots = phone
    .locator("button:has-text('Available times'), [role='button']:has-text('Available times')")
    .first();
  if (await openSlots.count()) {
    await openSlots.click({ force: true }).catch(() => undefined);
    await phone.waitForTimeout(700);
  }

  if (shouldCapture("booking-time")) {
    await screenshotPage(phone, "booking-time", { freeze: false });
  }

  // Times are inline; still click slot buttons via DOM so off-screen slots work.
  // Retry once if the confirm form did not appear (older sheet layouts can close without selecting).
  for (let attempt = 0; attempt < 2; attempt++) {
    const clickedSlot = await phone.evaluate(`(() => {
      var btn = Array.prototype.find.call(document.querySelectorAll("button"), function (b) {
        return /^\\d{1,2}:\\d{2}/.test((b.textContent || "").trim());
      });
      if (!btn) return false;
      btn.click();
      return true;
    })()`);
    if (!clickedSlot) {
      console.warn("No time slot button found — booking-confirm may still be on time step");
      break;
    }
    await phone.waitForTimeout(1200);
    const onConfirm = await phone.evaluate(`(() => {
      return Array.prototype.some.call(document.querySelectorAll("button"), function (b) {
        return /Confirm booking/i.test(b.textContent || "");
      });
    })()`);
    if (onConfirm) break;
    if (attempt === 0) {
      // Harmless fallback if an "Available times" sheet trigger is still in the DOM.
      const reopen = phone
        .locator("button:has-text('Available times'), [role='button']:has-text('Available times')")
        .first();
      if (await reopen.count()) {
        await reopen.click({ force: true }).catch(() => undefined);
        await phone.waitForTimeout(700);
      }
    }
  }
  await settle(phone, /confirm|pay|details|name|phone|Your details|Review|Confirm booking/i);
  if (shouldCapture("booking-confirm")) {
    await screenshotPage(phone, "booking-confirm", { freeze: false });
  }

  // Manage / review need real booking tokens — bare screen mockups (no nested bezel).
  if (shouldCapture("booking-manage")) {
    await captureBookingScreenMockup(page, "booking-manage");
  }
  if (shouldCapture("booking-review")) {
    await captureBookingScreenMockup(page, "booking-review");
  }

  await phone.close();
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function capturePreview(page: Page) {
  for (const mockupId of DOCS_PREVIEW_MOCKUP_IDS) {
    await capturePreviewMockup(page, mockupId);
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  if (mode === "preview") {
    await capturePreview(page);
  } else {
    await captureLive(page);
  }

  await browser.close();
  console.log(`Done (${mode} mode). Screenshots in public/docs/screenshots/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
