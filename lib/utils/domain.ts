/**
 * Extracts and normalizes the domain from a URL
 * Examples:
 * - "https://www.spincash.cc" -> "spincash.cc"
 * - "https://spincash.cc" -> "spincash.cc"
 * - "http://www.example.com" -> "example.com"
 * - "https://subdomain.example.com" -> "subdomain.example.com"
 */
export function extractDomainFromUrl(url: string): string {
  try {
    // Create URL object to parse the URL
    const urlObj = new URL(url);
    
    // Get the hostname (e.g., "www.spincash.cc" or "spincash.cc")
    let hostname = urlObj.hostname;
    
    // Remove "www." prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch (error) {
    console.error('Failed to extract domain from URL:', url, error);
    // Fallback: try to extract domain using regex
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    if (match && match[1]) {
      return match[1].split(':')[0]; // Remove port if present
    }
    throw new Error(`Invalid URL format: ${url}`);
  }
}

/**
 * Gets the current domain from window.location
 * Returns the full URL with https:// prefix
 * For localhost or bruii.com, returns 'https://serverhub.biz' as fallback
 * For production, returns 'https://<domain>' (e.g., 'https://spincash.cc')
 */
export function getCurrentDomain(): string {
  if (typeof window === 'undefined') {
    throw new Error('getCurrentDomain can only be called in the browser');
  }
  
  const hostname = window.location.hostname;
  
  // If running on localhost, use https://serverhub.biz as fallback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:') || hostname.startsWith('127.0.0.1:')) {
    return 'https://serverhub.biz';
  }
  
  // Extract domain from URL
  const domain = extractDomainFromUrl(window.location.href);
  
  // Special exception: bruii.com should use serverhub.biz
  if (domain === 'bruii.com') {
    return 'https://serverhub.biz';
  }
  
  // For production, return with https:// prefix
  return `https://${domain}`;
}

import { isPermittedSuperadminDomain } from '@/lib/constants/domains';

/**
 * Checks if the current domain is a permitted superadmin domain
 * Superadmin login does not require project UUID configuration
 */
export function isSuperadminDomain(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const hostname = window.location.hostname;
  
  return isPermittedSuperadminDomain(hostname);
}

