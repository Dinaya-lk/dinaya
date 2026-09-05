import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockList = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.example.com/biz/logo.webp" } }));

vi.mock("@/lib/api-auth", () => ({
  requireApiBusiness: vi.fn(async () => ({
    ok: true,
    context: { businessId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000002" },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  withDashboardRateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ galleryImages: ["https://cdn.example.com/a.webp"] }]),
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/supabase-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase-storage")>();
  return {
    ...actual,
    getSupabaseStorageConfig: vi.fn(() => ({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role",
    })),
    createBusinessLogosStorage: vi.fn(() => ({
      upload: mockUpload,
      list: mockList,
      remove: mockRemove,
      getPublicUrl: mockGetPublicUrl,
    })),
    publicLogoUrl: vi.fn(() => "https://cdn.example.com/biz/logo.webp?v=1"),
    removeOtherKindVariants: vi.fn(async () => undefined),
  };
});

describe("POST /api/dashboard/upload/image", () => {
  beforeEach(async () => {
    mockUpload.mockReset();
    mockUpload.mockResolvedValue({ error: null });
    const { removeOtherKindVariants } = await import("@/lib/supabase-storage");
    vi.mocked(removeOtherKindVariants).mockClear();
  });

  it("uploads a banner image for the authenticated business", async () => {
    const { POST } = await import("@/app/api/dashboard/upload/image/route");
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
    ]);
    const file = new File([webpBytes], "banner.webp", { type: "image/webp" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "banner");

    const req = new Request("http://localhost/api/dashboard/upload/image", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toContain("https://cdn.example.com");
    const [path, data, options] = mockUpload.mock.calls[0]!;
    expect(path).toBe("00000000-0000-4000-8000-000000000001/banner.webp");
    expect(Buffer.isBuffer(data)).toBe(true);
    expect(options).toEqual(expect.objectContaining({ contentType: "image/webp", upsert: true }));
  });

  it("uploads a lankaqr image for the authenticated business", async () => {
    const { POST } = await import("@/app/api/dashboard/upload/image/route");
    const { removeOtherKindVariants } = await import("@/lib/supabase-storage");
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
    ]);
    const file = new File([webpBytes], "lankaqr.webp", { type: "image/webp" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "lankaqr");

    const req = new Request("http://localhost/api/dashboard/upload/image", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toContain("https://cdn.example.com");
    const [path, data, options] = mockUpload.mock.calls[0]!;
    expect(path).toBe("00000000-0000-4000-8000-000000000001/lankaqr.webp");
    expect(Buffer.isBuffer(data)).toBe(true);
    expect(options).toEqual(expect.objectContaining({ contentType: "image/webp", upsert: true }));
    expect(removeOtherKindVariants).toHaveBeenCalledWith(
      expect.anything(),
      "00000000-0000-4000-8000-000000000001",
      "lankaqr",
      path,
    );
  });

  it("rejects invalid kinds", async () => {
    const { POST } = await import("@/app/api/dashboard/upload/image/route");
    const file = new File([new Uint8Array([1])], "logo.webp", { type: "image/webp" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "avatar");

    const req = new Request("http://localhost/api/dashboard/upload/image", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("rejects gallery uploads when the gallery is full", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ galleryImages: new Array(12).fill("https://cdn.example.com/x.webp") }]),
        })),
      })),
    } as never);

    const { POST } = await import("@/app/api/dashboard/upload/image/route");
    const file = new File([new Uint8Array([1])], "photo.webp", { type: "image/webp" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "gallery");

    const req = new Request("http://localhost/api/dashboard/upload/image", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
