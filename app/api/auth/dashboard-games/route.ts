import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BACKEND_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined in environment variables');
}

const DASHBOARD_GAMES_URL = `${BACKEND_URL}/users/dashboard-games/`;

/**
 * Explicit overrides for hosts that don't follow admin.<project> pattern
 * (e.g. staging servers like bitslot.serverhub.biz)
 */
const DOMAIN_OVERRIDES: Record<string, string> = {
  'bitslot.serverhub.biz': 'https://staging.bitslot.cc',
};

/**
 * Derives project domain from host.
 * - admin.spincash.cc -> https://spincash.cc
 * - admin.bitslot.cc -> https://bitslot.cc
 * - etc.
 */
function mapToProjectDomain(incomingDomain: string | undefined, host: string): string | undefined {
  const hostname = host.split(':')[0];

  // Check explicit overrides first
  for (const [adminHost, projectDomain] of Object.entries(DOMAIN_OVERRIDES)) {
    if (hostname.includes(adminHost)) {
      console.log(`✅ Host mapped: ${host} -> ${projectDomain}`);
      return projectDomain;
    }
  }

  // Generic rule: admin.<project> -> https://<project>
  if (hostname.startsWith('admin.')) {
    const project = hostname.slice(6); // "admin." = 6 chars
    const projectDomain = `https://${project}`;
    console.log(`✅ Host mapped: ${host} -> ${projectDomain}`);
    return projectDomain;
  }

  // Fallback: normalize incoming if client sent https://admin.xyz (e.g. old client or wrong Host header)
  if (incomingDomain && typeof incomingDomain === 'string') {
    const m = incomingDomain.match(/^https?:\/\/admin\.(.+)$/);
    if (m) {
      const normalized = `https://${m[1]}`;
      console.log(`✅ Incoming normalized: ${incomingDomain} -> ${normalized}`);
      return normalized;
    }
  }

  return incomingDomain;
}

export async function POST(request: Request) {
  try {
    // Parse request body to get project_domain (optional override)
    const body = await request.json();
    const incomingProjectDomain = body.project_domain;

    // Determine host from request headers
    const host = request.headers.get('host') ?? '';
    console.log('🔎 Host header:', host);
    console.log('🔎 Incoming project_domain:', incomingProjectDomain);

    // Map to correct project domain
    const projectDomain = mapToProjectDomain(incomingProjectDomain, host);

    if (!projectDomain || typeof projectDomain !== 'string') {
      return NextResponse.json(
        {
          status: 'error',
          message: 'project_domain is required and must be a string',
        },
        { status: 400 }
      );
    }

    console.log('🔷 Proxying dashboard-games to:', DASHBOARD_GAMES_URL);
    console.log('📤 Project domain:', projectDomain);

    // Forward the request to the external server
    const response = await fetch(DASHBOARD_GAMES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_domain: projectDomain,
      }),
    });

    console.log('📥 Backend response status:', response.status);

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server error response:', errorText);
      throw new Error(`Failed to fetch project UUID: ${response.status} ${response.statusText}`);
    }

    // Parse the response
    const data = await response.json();
    console.log(' Dashboard games response:', data);

    // Return the response
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('❌ Dashboard games proxy error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch project configuration',
      },
      { status: 500 }
    );
  }
}
