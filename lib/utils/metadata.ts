import type { Metadata } from 'next';
import {
  isSlotHouseHostname,
  SLOTHOUSE_FAVICON_ICO_SRC,
  SLOTHOUSE_FAVICON_SRC,
} from '@/lib/brand/slothouse';
import { extractBrandNameFromHostname } from './domain';

const DEFAULT_FAVICON = '/icon.svg';

/**
 * Generates dynamic metadata based on the current hostname
 * Extracts brand name from URL and uses it in title and description
 */
export function generateBrandMetadata(hostname: string): Metadata {
  const brandName = extractBrandNameFromHostname(hostname);
  const icons = isSlotHouseHostname(hostname)
    ? {
        icon: [{ url: SLOTHOUSE_FAVICON_SRC, type: 'image/png', sizes: '64x64' }],
        shortcut: SLOTHOUSE_FAVICON_ICO_SRC,
        apple: SLOTHOUSE_FAVICON_SRC,
      }
    : {
        icon: [{ url: DEFAULT_FAVICON, type: 'image/svg+xml' }],
      };

  return {
    title: `${brandName} Admin Panel`,
    description: `${brandName} Admin Dashboard`,
    icons,
  };
}
