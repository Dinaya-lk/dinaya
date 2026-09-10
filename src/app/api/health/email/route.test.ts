import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/platform-health", () => ({
  checkDatabaseHealth: vi.fn().mockResolvedValue({ status: "up", latencyMs: 1 }),
  checkEmailHealth: vi.fn().mockResolvedValue({ status: "up", latencyMs: 1 }),
  checkPaymentsHealth: vi.fn().mockResolvedValue({ status: "up", latencyMs: 1 }),
}));

import { GET, runtime } from "./route";

describe("GET /api/health/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HEALTH_CHECK_SECRET = "health-test-secret";
  });

  it("uses the Node runtime so collect-page-data can load platform-health", () => {
    expect(runtime).toBe("nodejs");
  });

  it("returns 401 without health secret", async () => {
    const req = new NextRequest("http://localhost/api/health/email");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns a response when authorized", async () => {
    const req = new NextRequest("http://localhost/api/health/email", {
      headers: { authorization: "Bearer health-test-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(600);
  });
});
