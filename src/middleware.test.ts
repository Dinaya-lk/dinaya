import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_DOMAIN = "dinaya.lk";
});

const lookupCustomDomainSlugMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: (handler: (req: NextRequest) => Promise<Response>) => handler,
  })),
}));

vi.mock("@/lib/custom-domain", () => ({
  lookupCustomDomainSlug: lookupCustomDomainSlugMock,
}));

import middleware from "../middleware";

describe("middleware docs markdown rewrites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupCustomDomainSlugMock.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_APP_DOMAIN = "dinaya.lk";
    process.env.PLATFORM_ADMIN_EMAILS = "admin@dinaya.lk";
  });

  it("rewrites docs markdown aliases to internal markdown routes", async () => {
    const req = new NextRequest("https://dinaya.lk/docs.md", {
      headers: {
        host: "dinaya.lk",
      },
    });
    const res = await middleware(req);

    expect(res.headers.get("x-middleware-rewrite")).toContain("/docs/markdown");
  });

  it("rewrites markdown aliases on localhost in development", async () => {
    const req = new NextRequest("http://localhost:3210/docs.md", {
      headers: {
        host: "localhost:3210",
      },
    });
    const res = await middleware(req);

    expect(res.headers.get("x-middleware-rewrite")).toContain("/docs/markdown");
  });

  it("uses request URL host when Host header is unavailable", async () => {
    const req = new NextRequest("http://localhost:3210/docs.md");
    const res = await middleware(req);

    expect(res.headers.get("x-middleware-rewrite")).toContain("/docs/markdown");
  });

  it("rewrites llms.txt alias to the llms route", async () => {
    const req = new NextRequest("https://dinaya.lk/llms.txt", {
      headers: {
        host: "dinaya.lk",
      },
    });
    const res = await middleware(req);

    expect(res.headers.get("x-middleware-rewrite")).toContain("/llms");
  });

  it("rewrites docs pages to markdown when requested via Accept header", async () => {
    const req = new NextRequest("https://dinaya.lk/docs/guides/setup-booking-page", {
      headers: {
        host: "dinaya.lk",
        accept: "text/markdown",
      },
    });
    const res = await middleware(req);

    expect(res.headers.get("x-middleware-rewrite")).toContain(
      "/docs/guides/setup-booking-page/markdown",
    );
  });

  it("keeps HTML docs requests unchanged", async () => {
    const req = new NextRequest("https://dinaya.lk/docs", {
      headers: {
        host: "dinaya.lk",
      },
    });
    const res = await middleware(req);

    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("preserves existing subdomain booking rewrites", async () => {
    const req = new NextRequest("https://salon.dinaya.lk/docs");
    const res = await middleware(req);

    const rewrite = res.headers.get("x-middleware-rewrite");
    expect(rewrite).toBeTruthy();
    expect(rewrite).toContain("/book/salon/docs");
  });

  it("redirects signed-in non-admin users away from /admin", async () => {
    const req = new NextRequest("https://dinaya.lk/admin", {
      headers: {
        host: "dinaya.lk",
      },
    });
    Object.assign(req, {
      auth: {
        user: {
          email: "owner@example.com",
        },
      },
    });

    const res = await middleware(req);

    expect(res.headers.get("location")).toContain("/auth/signin");
    expect(res.headers.get("location")).toContain("callbackUrl=%2Fadmin");
  });

  it("allows platform admins through /admin", async () => {
    const req = new NextRequest("https://dinaya.lk/admin", {
      headers: {
        host: "dinaya.lk",
      },
    });
    Object.assign(req, {
      auth: {
        user: {
          email: "admin@dinaya.lk",
        },
      },
    });

    const res = await middleware(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("allows founder developer emails through /admin without PLATFORM_ADMIN_EMAILS", async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;

    const req = new NextRequest("https://dinaya.lk/admin", {
      headers: {
        host: "dinaya.lk",
      },
    });
    Object.assign(req, {
      auth: {
        user: {
          email: "suvenseoras@gmail.com",
        },
      },
    });

    const res = await middleware(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
