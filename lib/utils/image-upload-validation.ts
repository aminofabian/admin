/**
 * Content-sniffing image validation for uploads.
 *
 * `File.type` comes from the multipart part's client-supplied Content-Type, so
 * `curl -F 'file=@payload.svg;type=image/png'` passes any `startsWith('image/')`
 * check. The bytes are what matter, so the signature is read from the file's
 * magic numbers instead.
 *
 * Kept dependency-free: the formats below cover everything an operator can
 * realistically send from a support conversation, and an allowlist that rejects
 * everything unknown is the safe default.
 */

/** Formats accepted, keyed by the MIME type they actually represent. */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

type SniffResult = { ok: true; mime: string } | { ok: false; reason: string };

/**
 * Read the leading bytes of a blob.
 *
 * `Blob.prototype.arrayBuffer` is not implemented on every runtime (jsdom's
 * sliced blobs lack it), so fall back to `FileReader` and then to reading the
 * whole blob. Callers cap the size, so reading in full is bounded.
 */
async function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }

  if (typeof FileReader === 'function') {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsArrayBuffer(blob);
    });
  }

  throw new Error('No way to read the uploaded file in this runtime.');
}

/**
 * Read the leading bytes of a file and identify it by magic number.
 *
 * Only the first 12 bytes are needed for every format below, so this is cheap
 * regardless of file size.
 */
export async function sniffImageMime(file: File): Promise<SniffResult> {
  let head: Uint8Array;
  try {
    head = await readBytes(file.slice(0, 12));
  } catch {
    head = (await readBytes(file)).subarray(0, 12);
  }

  const startsWith = (...bytes: number[]) =>
    bytes.every((byte, index) => head[index] === byte);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { ok: true, mime: 'image/png' };
  }

  // JPEG: FF D8 FF
  if (startsWith(0xff, 0xd8, 0xff)) {
    return { ok: true, mime: 'image/jpeg' };
  }

  // GIF: "GIF87a" / "GIF89a"
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) {
    const version = String.fromCharCode(head[3], head[4], head[5]);
    if (version === '87a' || version === '89a') {
      return { ok: true, mime: 'image/gif' };
    }
  }

  // RIFF....WEBP  (bytes 0-3 "RIFF", bytes 8-11 "WEBP")
  if (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) {
    return { ok: true, mime: 'image/webp' };
  }

  return {
    ok: false,
    reason: 'File content is not a supported image (png, jpeg, gif or webp).',
  };
}

/**
 * Check an upload against the allowlist by content, then by declared type.
 *
 * Both checks must agree: the magic number is authoritative, and a mismatch
 * with the declared type means the multipart headers were crafted, not the
 * file. SVG is deliberately excluded — it is an XML document that can carry
 * script, and it is served from the same origin as the chat.
 */
export async function validateUploadedImage(file: File): Promise<SniffResult> {
  if (file.size === 0) {
    return { ok: false, reason: 'File is empty.' };
  }

  const sniffed = await sniffImageMime(file);
  if (!sniffed.ok) {
    return sniffed;
  }

  if (!ALLOWED_MIME_TYPES.has(sniffed.mime)) {
    return { ok: false, reason: `Unsupported image type: ${sniffed.mime}` };
  }

  // A declared type that disagrees with the content indicates a crafted
  // multipart body. Treat the sniffed value as authoritative either way.
  if (file.type && file.type.toLowerCase() !== sniffed.mime) {
    return {
      ok: false,
      reason: `Declared type (${file.type}) does not match file content (${sniffed.mime}).`,
    };
  }

  return { ok: true, mime: sniffed.mime };
}

/** Formats passed to Cloudinary so it cannot store anything else. */
export const CLOUDINARY_ALLOWED_FORMATS = ['png', 'jpg', 'gif', 'webp'] as const;

/**
 * Hard ceiling on an uploaded image.
 *
 * Enforced from the declared Content-Length before the body is buffered, and
 * again against the parsed file — the length header alone is client-supplied.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
