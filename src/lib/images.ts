import { validateImageUpload, type ImageKind } from "@/convex/helpers";

/** File picker accept list — mirrors what the server's magic-byte check allows. */
export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";
export const IMAGE_MAX_MB = 2;

/**
 * Read a picked/dropped file and validate it with the *same* rules the server
 * enforces (real type via magic bytes, max size, pixel dimensions, SVG safety)
 * so the admin gets instant feedback before anything is uploaded.
 *
 * Returns the raw bytes ready for `api.images.upload`.
 */
export async function readValidatedImage(
  file: File,
  kind: ImageKind,
): Promise<ArrayBuffer> {
  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }
  const buffer = await file.arrayBuffer();
  validateImageUpload(buffer, kind);
  return buffer;
}

/** Human-readable accept hint shown under upload zones. */
export const IMAGE_HINT = `PNG, JPG, WebP or SVG · up to ${IMAGE_MAX_MB} MB · min 32×32 px`;
