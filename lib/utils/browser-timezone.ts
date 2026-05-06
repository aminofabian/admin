/** Matches `RequestConfig['params']` on the API client (serializable query values). */
export type ApiQueryParams = Record<string, string | number | boolean | undefined>;

/**
 * IANA time zone in the browser (e.g. Africa/Nairobi). Undefined on the server.
 * Used for query params on list endpoints so the backend can align date filters with the viewer.
 */
export function getBrowserIanaTimezone(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 ? tz : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Merges `timezone` into API params when running in the browser (mirrors analytics behavior).
 */
export function paramsWithClientTimezone<T extends ApiQueryParams>(
  params: T | undefined,
): (T & { timezone: string }) | T | ApiQueryParams | undefined {
  const tz = getBrowserIanaTimezone();
  if (!tz) return params;
  if (params == null) {
    return { timezone: tz };
  }
  return { ...params, timezone: tz };
}
