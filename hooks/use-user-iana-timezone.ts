'use client';

import { useEffect, useState } from 'react';

const FALLBACK_TZ = 'UTC';

/**
 * IANA timezone for the current browser (e.g. America/New_York).
 * Starts as UTC, then updates after mount to avoid SSR/client hydration mismatch.
 */
export function useUserIanaTimezone(): string {
  const [timezone, setTimezone] = useState(FALLBACK_TZ);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {
      /* keep fallback */
    }
  }, []);

  return timezone;
}
