import type { LoginRequest, LoginResponse, DashboardGamesResponse } from '@/types';
import { API_BASE_URL } from '@/lib/constants/api';
import { getCurrentDomain, extractDomainFromUrl } from '@/lib/utils/domain';
import { isValidProjectUuid } from '@/lib/utils/project-uuid';

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

      // Fail closed on the backend's default project. Its UUID belongs to
      // another company, so using it would scope admin logins to the wrong
      // tenant.
      const projectName =
        typeof data?.data?.project_name === 'string'
          ? data.data.project_name
          : typeof data?.project_name === 'string'
            ? data.project_name
            : '';
      if (projectName === 'ProjectX') {
        throw new Error(
          `No project found for ${projectDomain}. Check that this admin domain is mapped to a registered project, or enter the project UUID manually.`
        );
      }

      return data as DashboardGamesResponse;
    } catch (error: unknown) {
      console.error('❌ Error fetching project UUID:', error);
      // Only real network failures (browser fetch rejects with TypeError) should
      // be reported as connectivity problems. HTTP errors keep their message.
      if (
        error instanceof TypeError ||
        (error instanceof Error && error.message === 'Failed to fetch')
      ) {
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
    
    const projectUuid = data.whitelabel_admin_uuid?.trim();
    if (projectUuid) {
      if (!isValidProjectUuid(projectUuid)) {
        throw new Error('Invalid project UUID. Please check the value and try again.');
      }
      payload.whitelabel_admin_uuid = projectUuid;
    }
    
    // Use Next.js API route to proxy the login request (avoids CORS)
    if (typeof window !== 'undefined') {
      console.log(
        '[login] NEXT_PUBLIC_API_URL (env):',
        process.env.NEXT_PUBLIC_API_URL ?? '(not set)',
      );
      console.log('[login] API_BASE_URL (effective, same as rest of client API):', API_BASE_URL);
    }

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

