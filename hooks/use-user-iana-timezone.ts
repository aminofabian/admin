'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * IANA timezone (e.g. America/New_York). `null` until resolved on the client so
 * analytics requests are not sent with a bogus UTC default first.
 */
export function useUserIanaTimezone(): string | null {
  const [timezone, setTimezone] = useState<string | null>(null);

  useLayoutEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(tz && tz.length > 0 ? tz : 'UTC');
    } catch {
      setTimezone('UTC');
    }
  }, []);

  return timezone;
}
