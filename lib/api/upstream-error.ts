/**
 * Safe handling of upstream (Django) error bodies.
 *
 * Django's default error responses can contain the exception type, the failing
 * query, model field names and occasionally field *values*. Forwarding that
 * verbatim into a Next.js response exposes internals to the browser and, because
 * the admin UI renders these strings, to the operator.
 *
 * `detail` is a widely-consumed contract across this dashboard (several screens
 * fall back to it, and treat it as a JSON string of field errors), so it is
 * sanitised rather than removed: only recognised, user-facing fields survive.
 */

export type UpstreamErrorBody = {
  /** User-facing message safe to show in the UI. */
  message: string;
  /** Sanitised `detail`, matching the shape existing clients expect. */
  detail: string;
  /** Correlation id to quote in a bug report. */
  requestId: string;
  /** Numeric upstream status, for branching without leaking status text. */
  upstreamStatus: number;
};

const MAX_DETAIL_LENGTH = 300;

/**
 * Flatten a field-error structure into readable `field: message` lines.
 *
 * Django returns values as arrays or nested objects, so the key is carried down
 * the recursion — without it an operator sees "Must be a number" with no idea
 * which field it refers to.
 */
function collectFieldErrors(value: unknown, out: string[], prefix = '', depth = 0): void {
  if (depth > 3 || out.length > 8) return;

  const label = prefix.replace(/_/g, ' ');

  if (typeof value === 'string') {
    if (value.length > 200 || /[<>\\]/.test(value)) return;
    out.push(label ? `${label}: ${value}` : value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectFieldErrors(item, out, prefix, depth + 1);
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      collectFieldErrors(nested, out, label ? `${label} ${key}` : key, depth + 1);
    }
  }
}

/** True when a string looks like HTML, a traceback, or a filesystem path. */
function looksUnsafe(value: string): boolean {
  return (
    value.includes('<') ||
    value.includes('>') ||
    /Traceback \(most recent call last\)/.test(value) ||
    /\/usr\/lib\/python|\/app\/|site-packages/.test(value) ||
    value.includes('Traceback') ||
    value.length > 500
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function buildUpstreamError(
  upstreamStatus: number,
  rawBody: string,
  requestId: string,
): UpstreamErrorBody {
  let detail = '';
  let message = 'The request could not be completed. Please try again.';

  if (rawBody) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;

      const candidateMessage = record.message ?? record.error ?? record.detail;
      if (typeof candidateMessage === 'string' && !looksUnsafe(candidateMessage)) {
        message = candidateMessage;
      }

      const fieldErrors: string[] = [];
      const source = record.errors ?? record.field_errors ?? (isPlainObject(record.detail) ? record.detail : null);
      if (source) collectFieldErrors(source, fieldErrors);
      const safeFields = fieldErrors.filter((entry) => !looksUnsafe(entry));
      if (safeFields.length > 0) {
        detail = safeFields.join('; ').slice(0, MAX_DETAIL_LENGTH);
      } else if (typeof record.detail === 'string' && !looksUnsafe(record.detail)) {
        detail = record.detail.slice(0, MAX_DETAIL_LENGTH);
      }
    } else if (!looksUnsafe(rawBody)) {
      // A short plain-text body (e.g. "Not found") is safe to show; an HTML
      // error page or traceback is not.
      const trimmed = rawBody.trim();
      if (trimmed.length > 0) {
        message = trimmed.slice(0, 200);
      }
    }
  }

  if (!detail) {
    detail = message;
  }

  // Always log the full body server-side; never return it.
  return { message, detail, requestId, upstreamStatus };
}

/** Short, non-guessable-enough id for correlating a UI error with a log line. */
export function createErrorRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
