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
    return 'https://bruii.com';
  }
  
  // Extract domain from URL
  const domain = extractDomainFromUrl(window.location.href);
  
  // Special exception: bruii.com should use serverhub.biz
  if (domain === 'sa.bruii.com') {
    return 'https://bruii.com';
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

/**
 * Extracts the brand name from a hostname (server-side compatible)
 * Examples:
 * - "admin.spincash.cc" -> "SPINCASH"
 * - "bitslot.bruii.com" -> "BITSLOT"
 * - "spincash.bruii.com" -> "SPINCASH"
 * - "sa.bruii.com" -> "BRUII" (special exception)
 * - "admin.example.com" -> "EXAMPLE"
 * - "localhost" -> "SLOTTHING" (fallback)
 * 
 * Returns the brand name in uppercase, or "SLOTTHING" for localhost
 */
export function extractBrandNameFromHostname(hostname: string): string {
  // For localhost, return SLOTTHING
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:') || hostname.startsWith('127.0.0.1:')) {
    return 'SLOTTHING';
  }
  
  try {
    // Special handling for .bruii.com domains
    if (hostname.endsWith('.bruii.com') || hostname === 'bruii.com') {
      const parts = hostname.split('.');
      
      // For sa.bruii.com, return BRUII
      if (parts[0] === 'sa') {
        return 'BRUII';
      }
      
      // For other .bruii.com subdomains (e.g., bitslot.bruii.com, spincash.bruii.com)
      // Return the subdomain as the brand name
      if (parts.length >= 3 && parts[parts.length - 2] === 'bruii' && parts[parts.length - 1] === 'com') {
        return parts[0].toUpperCase();
      }
      
      // Fallback for bruii.com (no subdomain)
      if (hostname === 'bruii.com') {
        return 'BRUII';
      }
    }
    
    // For other domains, split hostname by dots
    const parts = hostname.split('.');
    
    // For subdomains like "admin.spincash.cc", get "spincash" (second-to-last part)
    // For domains like "spincash.cc", get "spincash" (first part)
    if (parts.length >= 2) {
      // If we have subdomain.domain.tld, get the domain part
      // If we have domain.tld, get the domain part
      const brandPart = parts.length > 2 ? parts[parts.length - 2] : parts[0];
      return brandPart.toUpperCase();
    }
    
    // Fallback to first part if structure is unexpected
    return parts[0]?.toUpperCase() || 'SLOTTHING';
  } catch (error) {
    console.error('Failed to extract brand name from hostname:', hostname, error);
    return 'SLOTTHING';
  }
}

/**
 * Extracts the brand name from the current URL (client-side)
 * Examples:
 * - "https://admin.spincash.cc/login" -> "SPINCASH"
 * - "https://bitslot.bruii.com" -> "BITSLOT"
 * - "https://spincash.bruii.com" -> "SPINCASH"
 * - "https://sa.bruii.com" -> "BRUII" (special exception)
 * - "https://admin.example.com" -> "EXAMPLE"
 * - "localhost" -> "SLOTTHING" (fallback)
 * 
 * Returns the brand name in uppercase, or "SLOTTHING" for localhost
 */
export function getBrandName(): string {
  if (typeof window === 'undefined') {
    return 'SLOTTHING';
  }
  
  return extractBrandNameFromHostname(window.location.hostname);
}

/**
 * Gets the player frontend URL based on the current admin domain
 * Dynamically constructs the player frontend URL from the brand name
 * Examples:
 * - "bitslot.bruii.com" -> "https://bitslot.cc/login"
 * - "spincash.bruii.com" -> "https://spincash.cc/login"
 * - "anybrand.bruii.com" -> "https://anybrand.cc/login"
 * 
 * Returns the player frontend URL, or null if domain cannot be mapped
 */
export function getPlayerFrontendUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const hostname = window.location.hostname.toLowerCase();
  
  // Skip localhost and superadmin domains
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:') || hostname.startsWith('127.0.0.1:')) {
    return null;
  }
  
  // Skip superadmin domain
  if (hostname === 'sa.bruii.com' || isSuperadminDomain()) {
    return null;
  }
  
  // Extract brand name from hostname
  const brandName = extractBrandNameFromHostname(hostname).toLowerCase();
  
  // Skip if brand name is invalid or fallback
  if (!brandName || brandName === 'slotthing' || brandName === 'bruii') {
    return null;
  }
  
  // Construct player frontend URL: https://{brandname}.cc/login
  return `https://${brandName}.cc/login`;
}

