/**
 * Permitted domains for superadmin access
 * Superadmin users can only access the application from these domains
 */
export const PERMITTED_SUPERADMIN_DOMAINS = [
  'sa.bruii.com',
  'localhost',
  '127.0.0.1',
] as const;

type PermittedDomain = typeof PERMITTED_SUPERADMIN_DOMAINS[number];

/**
 * Check if a hostname is a permitted superadmin domain
 */
export function isPermittedSuperadminDomain(hostname: string): boolean {
  // Check exact match
  if ((PERMITTED_SUPERADMIN_DOMAINS as readonly string[]).includes(hostname)) {
    return true;
  }
  
  // Check if hostname starts with localhost (for localhost:3000, etc.)
  if (hostname.startsWith('localhost:')) {
    return true;
  }
  
  // Check if hostname starts with 127.0.0.1 (for 127.0.0.1:3000, etc.)
  if (hostname.startsWith('127.0.0.1:')) {
    return true;
  }
  
  return false;
}
