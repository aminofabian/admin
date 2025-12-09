import type { LoginRequest, LoginResponse, DashboardGamesResponse } from '@/types';
import { getCurrentDomain, extractDomainFromUrl } from '@/lib/utils/domain';

export const authApi = {
  fetchProjectUuid: async () => {
    try {
      // Extract domain from current URL
      let projectDomain: string;
      try {
        projectDomain = getCurrentDomain();
      } catch (error) {
        console.error('Failed to extract domain from URL:', error);
        // Fallback to environment variable if available, normalize it
        const envDomain = process.env.NEXT_PUBLIC_PROJECT_DOMAIN;
        if (envDomain) {
          // If env var already has https://, use it as-is, otherwise add it
          if (envDomain.startsWith('http://') || envDomain.startsWith('https://')) {
            projectDomain = envDomain;
          } else {
            try {
              const normalized = extractDomainFromUrl(envDomain);
              projectDomain = `https://${normalized}`;
            } catch {
              // If env var is already just a domain, add https://
              projectDomain = `https://${envDomain}`;
            }
          }
        } else {
          projectDomain = 'https://serverhub.biz';
        }
      }

      console.log('🌐 Extracted project domain:', projectDomain);

      // Use Next.js API route to proxy the request (avoids CORS)
      const response = await fetch('/api/auth/dashboard-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_domain: projectDomain,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Failed to fetch project UUID: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(' Dashboard games response:', data);
      return data as DashboardGamesResponse;
    } catch (error: unknown) {
      console.error('❌ Error fetching project UUID:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection or if the server is accessible.');
      }
      throw error;
    }
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const payload: Record<string, string> = {
      username: data.username,
      password: data.password,
    };
    
    if (data.whitelabel_admin_uuid && data.whitelabel_admin_uuid.trim()) {
      payload.whitelabel_admin_uuid = data.whitelabel_admin_uuid.trim();
    }
    
    // Use Next.js API route to proxy the login request (avoids CORS)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'include', //  CRITICAL: Accept Set-Cookie headers from API route
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw errorData;
    }
    
    const result = await response.json();
    
    // Check if the backend returned an error status
    if (result._status && result._status >= 400) {
      throw result;
    }
    
    // Remove the internal _status field before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _status, ...cleanResult } = result;
    return cleanResult as LoginResponse;
  },
};

