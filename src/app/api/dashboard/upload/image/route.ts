import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { requireApiBusiness } from "@/lib/api-auth";
import { withDashboardRateLimit } from "@/lib/rate-limit";
import {
  createBusinessLogosStorage,
  getSupabaseStorageConfig,
  IMAGE_UPLOADS_UNAVAILABLE,
  publicLogoUrl,
  removeOtherKindVariants,
} from "@/lib/supabase-storage";
import { detectImageMimeType, extensionForMimeType } from "@/lib/image-upload-validation";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 12;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_KINDS = new Set(["logo", "banner", "gallery", "lankaqr"]);

function storagePath(businessId: string, kind: string, ext: string): string {
  if (kind === "gallery") {
    return `${businessId}/gallery/${randomUUID()}.${ext}`;
  }
  return `${businessId}/${kind}.${ext}`;
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiBusiness({ req });
  if (!authResult.ok) return authResult.response;

  const { businessId } = authResult.context;

  const rateLimit = await withDashboardRateLimit(req, businessId);
  if (!rateLimit.ok) return rateLimit.response;

  const storageConfig = getSupabaseStorageConfig();
  if (!storageConfig) {
    console.error("[upload/image] storage is not configured");
    return NextResponse.json({ error: IMAGE_UPLOADS_UNAVAILABLE }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "logo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "Invalid image type." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 4 MB." }, { status: 400 });
  }

  if (kind === "gallery") {
    const [row] = await db
      .select({ galleryImages: businesses.galleryImages })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const count = (row?.galleryImages ?? []).filter(Boolean).length;
    if (count >= MAX_GALLERY_IMAGES) {
      return NextResponse.json(
        { error: `Gallery is full (${MAX_GALLERY_IMAGES} photos max). Remove a photo before uploading.` },
        { status: 400 },
      );
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageMimeType(buffer);
  if (!detectedType || !ALLOWED_TYPES.has(detectedType)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed." }, { status: 400 });
  }

  const ext = extensionForMimeType(detectedType);
  const path = storagePath(businessId, kind, ext);

  const storage = createBusinessLogosStorage(storageConfig);
  const { error } = await storage.upload(path, buffer, {
    contentType: detectedType,
    upsert: kind !== "gallery",
  });
  if (error) {
    console.error("Image upload failed:", error.message);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  if (kind === "logo" || kind === "banner" || kind === "lankaqr") {
    await removeOtherKindVariants(storage, businessId, kind, path);
  }

  return NextResponse.json({ url: publicLogoUrl(storage, path) });
}
