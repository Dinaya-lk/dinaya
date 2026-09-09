import { test, expect } from "@playwright/test";
import { makeAccount, registerViaApi } from "./helpers/auth";

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
      await expect(page.getByText("Haircut")).toBeVisible();
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
    await expect(page.getByText("Haircut")).toBeVisible({ timeout: 15_000 });
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
    const background = await signIn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background.replace(/\s/g, "")).toMatch(/rgb\(37,99,235\)|rgba\(37,99,235/);
  });
});

test.describe("Live Vercel — auth redirects", () => {
  test("unauthenticated /dashboard redirects to sign-in on same host", async ({ page }) => {
    test.fixme(
      true,
      "Fix Vercel env AUTH_URL / NEXT_PUBLIC_APP_URL — currently redirects to dead dinaya-tau.vercel.app",
    );

    await page.goto("/dashboard");
    await page.waitForURL(/\/auth\/signin/, { timeout: 15_000 });

    const host = new URL(page.url()).hostname;
    expect(host).toBe("dinaya-lk.vercel.app");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });
});
