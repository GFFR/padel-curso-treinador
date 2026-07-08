import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const MATERIALS_BUCKET = "materiais";

/** Signed-link lifetime: covers a full 90-minute exam with slack. */
const SIGNED_URL_TTL_SECONDS = 3 * 60 * 60;

/**
 * Storage object key for a course PDF. Supabase Storage rejects accented
 * characters in keys, so file names are slugified deterministically — the
 * same mapping is used at upload time and at link time.
 */
export function materialStorageKey(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_");
}

/**
 * Short-lived signed URL for a course PDF, opened at a specific page.
 * Callers must have verified the student session first (the bucket is
 * private by decision — copyrighted IPDJ materials).
 */
export async function signMaterialUrl(
  fileName: string,
  page?: number | null,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(materialStorageKey(fileName), SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return page ? `${data.signedUrl}#page=${page}` : data.signedUrl;
}

/** Signs several files at once, keyed by original file name. */
export async function signMaterialUrls(
  fileNames: Iterable<string>,
): Promise<Map<string, string>> {
  const unique = [...new Set(fileNames)];
  const urls = new Map<string, string>();
  await Promise.all(
    unique.map(async (fileName) => {
      const url = await signMaterialUrl(fileName);
      if (url) urls.set(fileName, url);
    }),
  );
  return urls;
}
