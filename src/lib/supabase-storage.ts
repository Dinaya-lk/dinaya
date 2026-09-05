import { createClient } from "@supabase/supabase-js";

export const BUSINESS_LOGOS_BUCKET = "business-logos";

export const IMAGE_UPLOADS_UNAVAILABLE =
  "Image uploads are not available right now. Please try again later.";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseStorageConfig(): SupabaseStorageConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

export function createBusinessLogosStorage(config: SupabaseStorageConfig) {
  return createClient(config.url, config.serviceRoleKey).storage.from(BUSINESS_LOGOS_BUCKET);
}

export function extensionFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext || !MIME_BY_EXT[ext]) {
    throw new Error(`Unsupported image extension in path: ${path}`);
  }
  return ext === "jpeg" ? "jpeg" : ext;
}

export function contentTypeForExtension(ext: string): string {
  const normalized = ext === "jpg" ? "jpeg" : ext;
  const mime = MIME_BY_EXT[normalized];
  if (!mime) throw new Error(`Unsupported image extension: ${ext}`);
  return mime;
}

export function publicLogoUrl(storage: ReturnType<typeof createBusinessLogosStorage>, path: string): string {
  const { data } = storage.getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** Map a public Supabase object URL back to its storage path, or null if not our bucket. */
export function storagePathFromPublicUrl(publicUrl: string, supabaseProjectUrl: string): string | null {
  try {
    const base = new URL(supabaseProjectUrl);
    const url = new URL((publicUrl.split("?")[0] ?? publicUrl).trim());
    if (url.origin !== base.origin) return null;

    const marker = `/storage/v1/object/public/${BUSINESS_LOGOS_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;

    const path = decodeURIComponent(url.pathname.slice(idx + marker.length));
    if (!path || path.includes("..")) return null;
    return path;
  } catch {
    return null;
  }
}

export function isBusinessImageStorageUrl(publicUrl: string, supabaseProjectUrl?: string): boolean {
  const baseUrl = supabaseProjectUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!baseUrl) return false;
  return storagePathFromPublicUrl(publicUrl, baseUrl) !== null;
}

export function isOwnedStoragePath(path: string, businessId: string): boolean {
  return path.startsWith(`${businessId}/`) && !path.includes("..");
}

export async function deleteStorageObjects(
  storage: ReturnType<typeof createBusinessLogosStorage>,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await storage.remove(paths);
  if (error) {
    console.error("[storage] delete failed:", error.message);
  }
}

/** Remove logo/banner/lankaqr files with other extensions after a replacement upload. */
export async function removeOtherKindVariants(
  storage: ReturnType<typeof createBusinessLogosStorage>,
  businessId: string,
  kind: "logo" | "banner" | "lankaqr",
  keepPath: string,
): Promise<void> {
  const { data, error } = await storage.list(businessId);
  if (error || !data?.length) return;

  const prefix = `${kind}.`;
  const paths = data
    .filter((item) => item.name.startsWith(prefix))
    .map((item) => `${businessId}/${item.name}`)
    .filter((p) => p !== keepPath && isOwnedStoragePath(p, businessId));

  await deleteStorageObjects(storage, paths);
}

export async function deleteBusinessImagesByPublicUrls(
  urls: string[],
  businessId: string,
): Promise<void> {
  const config = getSupabaseStorageConfig();
  if (!config || urls.length === 0) return;

  const storage = createBusinessLogosStorage(config);
  const paths = urls
    .map((url) => storagePathFromPublicUrl(url, config.url))
    .filter((path): path is string => path !== null && isOwnedStoragePath(path, businessId));

  await deleteStorageObjects(storage, paths);
}
