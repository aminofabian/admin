import type { Metadata } from 'next';
import { extractBrandNameFromHostname } from './domain';

/**
 * Generates dynamic metadata based on the current hostname
 * Extracts brand name from URL and uses it in title and description
 */
export function generateBrandMetadata(hostname: string): Metadata {
  const brandName = extractBrandNameFromHostname(hostname);
  
  return {
    title: `${brandName} Admin Panel`,
    description: `${brandName} Admin Dashboard`,
  };
}
