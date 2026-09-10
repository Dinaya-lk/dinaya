import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { loginViaApi, makeAccount, nextBookableDate, registerViaApi } from "./helpers/auth";

/**
 * Smoke + registration tests against the live Vercel deployment.
 * Does not switch plans (requires DATABASE_URL with production access).
 * Run: npm run test:e2e:live
 */

const PUBLIC_ROUTES: { path: string; heading: string | RegExp }[] = [
  { path: "/", heading: /Dinaya|bookable|calendar/i },
  { path: "/register", heading: /Create your account/i },
  { path: "/auth/signin", heading: /Welcome back/i },
  { path: "/pricing", heading: /Pricing|plan/i },
  { path: "/features", heading: /Features|booking/i },
  { path: "/docs", heading: "Learn Dinaya" },
];

const DEVICE_HEADERS = {
  "X-Dinaya-Desktop": "1",
  "X-Dinaya-Mobile": "1",
};

function desktopAlias(path: string): string {
  return path.replace("/api/v1/mobile/", "/api/v1/desktop/");
}

async function deviceRequest(
  request: APIRequestContext,
  method: "GET" | "POST" | "PATCH",
  path: string,
  options?: { bearer?: string; data?: unknown },
) {
  const headers: Record<string, string> = { ...DEVICE_HEADERS };
  if (options?.bearer) headers.Authorization = `Bearer ${options.bearer}`;
  const init = method === "GET" ? { headers } : { headers, data: options?.data };

  const send = (target: string) => {
    switch (method) {
      case "GET":
        return request.get(target, init);
      case "POST":
        return request.post(target, init);
      case "PATCH":
        return request.patch(target, init);
      default: {
        const _exhaustive: never = method;
        return _exhaustive;
      }
    }
  };

  const primary = await send(path);
  if (primary.status() !== 404) return primary;
  return send(desktopAlias(path));
}

async function saveVisual(page: Page, filename: string, fullPage = false) {
  const output = test.info().outputPath(filename);
  await page.screenshot({ path: output, fullPage });
  try {
    const extraDir = "/opt/cursor/artifacts/screenshots";
    await mkdir(extraDir, { recursive: true });
    await copyFile(output, join(extraDir, filename));
  } catch {
    // Cursor artifact mount is optional (CI / other agents).
  }
}

function catalogRows(body: {
  items?: Array<{ id?: string; name?: string; title?: string }>;
  rows?: Array<{ id?: string; name?: string; title?: string }>;
}) {
  return [...(body.items ?? []), ...(body.rows ?? [])];
}

async function completePhoneSetupIfNeeded(page: Page) {
  const setupHeading = page.getByRole("heading", { name: "Your page info" });
  await Promise.race([
    setupHeading.waitFor({ timeout: 20_000 }),
    page.getByRole("navigation", { name: "Primary" }).waitFor({ timeout: 20_000 }),
  ]).catch(() => undefined);

  if (!(await setupHeading.isVisible().catch(() => false)) && !page.url().includes("/setup")) {
    return;
  }

  await page.getByLabel(/WhatsApp/i).fill("+94771234567");
  const offer = page.getByLabel(/What you offer/i);
  if (await offer.isVisible().catch(() => false)) {
    await offer.fill("Haircuts and colour in Colombo");
  }
  await page.getByRole("button", { name: "Save & add your first service" }).click();
  await expect(page.getByRole("heading", { name: "What clients book" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Save service & set hours" }).click();
  await expect(page.getByRole("heading", { name: "When clients can book" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Confirm hours|Save hours/i }).click();
  await expect(page.getByRole("heading", { name: "Share your link" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Open my dashboard" }).click();
}

test.describe("Live Vercel — public pages", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} loads`, async ({ page }) => {
      const res = await page.goto(route.path);
      expect(res?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible({
        timeout: 15_000,
      });
    });
  }
});

test.describe("Live Vercel — account creation", () => {
  test("registers a new business via the UI", async ({ page }) => {
    const account = makeAccount("live-ui");

    await page.goto("/register");
    await page.getByLabel("Your name").fill(account.name);
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: /Continue/i }).click();

    await page.getByLabel("Business name").fill(account.businessName);
    await page.locator("#slug").fill(account.slug);
    await page.getByRole("button", { name: /Create free account/i }).click();

    // Auto-login may redirect to a stale AUTH_URL host; verify the account exists regardless.
    await expect(async () => {
      await page.goto(`/book/${account.slug}`);
      await expect(page.getByText("Haircut", { exact: true })).toBeVisible();
    }).toPass({ timeout: 45_000 });
  });

  test("registers via API", async ({ request }) => {
    const account = makeAccount("live-api");
    await registerViaApi(request, account);
  });

  test("new account public booking page shows seeded services", async ({ page, request }) => {
    const account = makeAccount("live-book");
    await registerViaApi(request, account);

    await page.goto(`/book/${account.slug}`);
    await expect(page.getByText("Haircut", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Live Vercel — phone visual tokens", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sign-in matches dashboard copy and cobalt primary", async ({ page }) => {
    const res = await page.goto("/auth/signin");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByText("Sign in to your Dinaya dashboard")).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Create your booking page/i })).toBeVisible();

    const signIn = page.getByRole("button", { name: /^Sign in$/i });
    await expect(signIn).toBeVisible();
    await saveVisual(page, "web-390-signin-playwright.png", true);
    const background = await signIn.evaluate((el) => getComputedStyle(el).backgroundColor);
    const rgb = background.match(/\d+/g)?.map(Number) ?? [];
    // CSS `--primary: 220 82% 53%` computes to rgb(37, 102, 233); brand hex #2563EB is rgb(37, 99, 235).
    expect(rgb[0]).toBeGreaterThanOrEqual(30);
    expect(rgb[0]).toBeLessThanOrEqual(45);
    expect(rgb[1]).toBeGreaterThanOrEqual(90);
    expect(rgb[1]).toBeLessThanOrEqual(115);
    expect(rgb[2]).toBeGreaterThanOrEqual(220);
    expect(rgb[2]).toBeGreaterThan(rgb[0]);
    expect(rgb[2]).toBeGreaterThan(rgb[1]);
  });
});

test.describe("Live Vercel — auth redirects", () => {
  test("unauthenticated /dashboard redirects to sign-in on same host", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth\/signin/, { timeout: 15_000 });

    const host = new URL(page.url()).hostname;
    expect(host).not.toMatch(/dinaya-tau/);
    const configuredBase = test.info().project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL;
    if (configuredBase) {
      expect(host).toBe(new URL(configuredBase).hostname);
    }
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });
});

test.describe("Live Vercel — phone dashboard shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("signed-in bottom nav matches Android Home Calendar Bookings Clients More", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const account = makeAccount("live-nav");
    await registerViaApi(request, account);
    await loginViaApi(page, request, account);
    await completePhoneSetupIfNeeded(page);

    const primary = page.getByRole("navigation", { name: "Primary" });
    await expect(primary).toBeVisible({ timeout: 20_000 });
    for (const label of ["Home", "Calendar", "Bookings", "Clients"] as const) {
      await expect(primary.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(primary.getByRole("button", { name: "More" })).toBeVisible();
    await expect(page.getByText(/Good day/i).first()).toBeVisible();
    await saveVisual(page, "web-390-dashboard-home.png", true);

    await primary.getByRole("link", { name: "Calendar" }).click();
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/No bookings/i).first()).toBeVisible({ timeout: 20_000 });
    await saveVisual(page, "web-390-dashboard-calendar.png", true);

    await primary.getByRole("link", { name: "Bookings" }).click();
    await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/No bookings here yet/i)).toBeVisible({ timeout: 20_000 });
    await saveVisual(page, "web-390-dashboard-bookings.png", true);

    await primary.getByRole("link", { name: "Clients" }).click();
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/TOTAL CUSTOMERS/i)).toBeVisible({ timeout: 20_000 });
    await saveVisual(page, "web-390-dashboard-clients.png", true);

    await primary.getByRole("button", { name: "More" }).click();
    const moreSheet = page.getByRole("dialog", { name: /More dashboard pages/i });
    await expect(moreSheet).toBeVisible();
    await expect(moreSheet.getByText("Catalog")).toBeVisible();
    await expect(moreSheet.getByText("Growth")).toBeVisible();
    await expect(moreSheet.getByText("Configure")).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Services" })).toBeVisible();
    await expect(moreSheet.getByRole("link", { name: "Deals" })).toBeVisible();
    await saveVisual(page, "web-390-dashboard-more.png");
  });
});

test.describe("Live Vercel — Android device API", () => {
  test("mobile login, bootstrap, overview, and bookings use the same merchant data", async ({
    request,
  }) => {
    const account = makeAccount("live-device");
    await registerViaApi(request, account);

    const loginRes = await deviceRequest(request, "POST", "/api/v1/mobile/auth/login", {
      data: {
        deviceName: "Playwright Pixel",
        email: account.email,
        password: account.password,
      },
    });
    expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
    const session = (await loginRes.json()) as {
      auth?: { keyType?: string };
      business?: { name?: string; slug?: string };
      desktopKey?: string;
      mobileKey?: string;
      deviceKey?: string;
    };
    const key = session.mobileKey ?? session.desktopKey ?? session.deviceKey;
    expect(key).toBeTruthy();
    expect(["mobile", "desktop"]).toContain(session.auth?.keyType);
    expect(session.business?.slug).toBe(account.slug);

    const bootstrapRes = await deviceRequest(request, "GET", "/api/v1/mobile/bootstrap", { bearer: key });
    expect(bootstrapRes.ok(), await bootstrapRes.text()).toBeTruthy();

    const overviewRes = await deviceRequest(request, "GET", "/api/v1/mobile/overview", { bearer: key });
    expect(overviewRes.ok(), await overviewRes.text()).toBeTruthy();
    const overview = (await overviewRes.json()) as { overview?: { businessName?: string } };
    expect(overview.overview?.businessName).toBe(account.businessName);

    const bookingsRes = await deviceRequest(request, "GET", "/api/v1/mobile/bookings?tab=today&limit=40", {
      bearer: key,
    });
    expect(bookingsRes.ok(), await bookingsRes.text()).toBeTruthy();
    const bookings = (await bookingsRes.json()) as { rows?: unknown[]; items?: unknown[] };
    expect(Array.isArray(bookings.rows ?? bookings.items ?? [])).toBe(true);

    const servicesRes = await deviceRequest(request, "GET", "/api/v1/mobile/services?limit=40", { bearer: key });
    expect(servicesRes.ok(), await servicesRes.text()).toBeTruthy();
    const services = (await servicesRes.json()) as {
      items?: Array<{ id?: string; name?: string; title?: string }>;
      rows?: Array<{ id?: string; name?: string; title?: string }>;
    };
    const serviceRows = catalogRows(services);
    expect(serviceRows.some((row) => (row.title ?? row.name ?? "").includes("Haircut"))).toBe(true);

    for (const path of ["/api/v1/mobile/deals", "/api/v1/mobile/broadcasts"] as const) {
      const gated = await deviceRequest(request, "GET", path, { bearer: key });
      const bodyText = await gated.text();
      expect([200, 402], `${path} ${bodyText}`).toContain(gated.status());
      if (gated.status() === 200) {
        const payload = JSON.parse(bodyText) as { items?: unknown[]; rows?: unknown[] };
        expect(Array.isArray(payload.items ?? payload.rows ?? [])).toBe(true);
      }
    }

    const haircut = serviceRows.find((row) => (row.title ?? row.name ?? "").includes("Haircut"));
    expect(haircut?.id).toBeTruthy();

    const date = nextBookableDate();
    let created: { id?: string; clientName?: string; status?: string } | null = null;
    let lastCreateBody = "";
    const createStatuses: number[] = [];
    for (const time of ["10:00:00", "14:00:00", "16:00:00"] as const) {
      const createRes = await deviceRequest(request, "POST", "/api/v1/mobile/bookings", {
        bearer: key,
        data: {
          clientName: "Live Device Client",
          clientPhone: "+94771234567",
          serviceId: haircut?.id,
          startsAt: `${date}T${time}`,
        },
      });
      createStatuses.push(createRes.status());
      lastCreateBody = await createRes.text();
      if (createRes.ok()) {
        created = JSON.parse(lastCreateBody) as { id?: string; clientName?: string; status?: string };
        break;
      }
      if (createRes.status() === 409) continue;
      if (createRes.status() === 404 || createRes.status() === 405) break;
      expect(createRes.ok(), lastCreateBody).toBeTruthy();
    }

    if (!created) {
      const writeMissing = createStatuses.every((status) => status === 404 || status === 405);
      expect(
        writeMissing,
        `walk-in create failed (${createStatuses.join(",")}): ${lastCreateBody}`,
      ).toBe(true);
      return;
    }

    expect(created.clientName).toBe("Live Device Client");

    const cancelRes = await deviceRequest(
      request,
      "POST",
      `/api/v1/mobile/bookings/${created.id}/cancel`,
      { bearer: key, data: { reason: "e2e cleanup" } },
    );
    expect(cancelRes.ok(), await cancelRes.text()).toBeTruthy();
  });
});
