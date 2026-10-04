/**
 * Rewrite Cloudinary delivery URLs (shared cloud dzlv4lat4) to the Cloudflare
 * R2 public bucket that now hosts those originals. Only chat images go through
 * this helper; banners and other Django media keep the URL the API returns.
 *
 * Exception: chat images uploaded to Cloudinary (`folder: 'chat'`) keep their
 * Cloudinary URL until the final delta sync has mirrored them — rewriting an
 * unmirrored key 404s and shows "Failed to load image". New uploads land on R2
 * directly once MEDIA_UPLOAD_PROVIDER=r2.
 *
 * Set NEXT_PUBLIC_MEDIA_BASE_URL at build time to serve from a custom domain.
 */

const DEFAULT_R2_BASE = "https://pub-0dd4bbe75add476fa861bf35802ca3db.r2.dev";
const R2_BASE = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim() || DEFAULT_R2_BASE
).replace(/\/+$/, "");
const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/dzlv4lat4/image/upload/";

/** Folders that still deliver from Cloudinary, not R2. */
const CLOUDINARY_ONLY_PREFIXES = ["chat/"] as const;

function cloudinaryPublicKey(url: string): string | null {
  if (!url.startsWith(CLOUDINARY_PREFIX)) return null;
  const parts = url.slice(CLOUDINARY_PREFIX.length).split("/");
  let i = 0;
  while (i < parts.length) {
    const seg = parts[i];
    if (/^v\d+$/.test(seg)) {
      i += 1;
      break;
    }
    // Cloudinary transform segments usually contain "_" or ","
    if (/[_,]/.test(seg)) {
      i += 1;
      continue;
    }
    break;
  }
  const key = parts.slice(i).join("/");
  return key || null;
}

export function toR2ImageUrl(
  url: string | null | undefined
): string {
  if (!url) return "";
  const key = cloudinaryPublicKey(url);
  if (!key) return url;
  if (CLOUDINARY_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return url;
  }
  return `${R2_BASE}/${key}`;
}
