import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const requireProMock = vi.hoisted(() => vi.fn());
const generateReviewReplyForBusinessMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan")>();
  return { ...actual, requirePro: requireProMock };
});

vi.mock("@/lib/dashboard/review-reply-ai", () => ({
  generateReviewReplyForBusiness: generateReviewReplyForBusinessMock,
}));

import { POST } from "./route";

const authOk = {
  ok: true as const,
  context: {
    businessId: "00000000-0000-4000-8000-000000000001",
    deviceId: "device_1",
  },
};

describe("POST /api/v1/desktop/reviews/[id]/generate-reply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopWriteMock.mockResolvedValue(authOk);
    requireProMock.mockResolvedValue(undefined);
    generateReviewReplyForBusinessMock.mockResolvedValue({
      reply: "Thank you for visiting us.",
      source: "groq",
    });
  });

  it("returns a generated reply for Growth businesses", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/reviews/review_1/generate-reply", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "review_1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe("Thank you for visiting us.");
    expect(generateReviewReplyForBusinessMock).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "review_1",
    );
  });

  it("returns 404 when the review is missing", async () => {
    generateReviewReplyForBusinessMock.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/desktop/reviews/missing/generate-reply", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});
