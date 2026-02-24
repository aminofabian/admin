import { NextResponse } from 'next/server';

const PROD_API_BASE = 'https://api.bruii.com';

/** In production, always use api.bruii.com; otherwise use env or fallback. */
function getBackendBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return PROD_API_BASE;
  }
  return process.env.NEXT_PUBLIC_API_URL || PROD_API_BASE;
}

const DASHBOARD_GAMES_URL = `${getBackendBaseUrl()}/users/dashboard-games/`;

/**
 * Domain mapping: admin panel hostname -> project domain for backend
 * This is the server-side backup mapping (client should already map via getCurrentDomain)
 */
const DOMAIN_MAPPINGS: Record<string, string> = {
  'bitslot.serverhub.biz': 'https://staging.bitslot.cc',
};

/**
 * Maps an incoming domain to the correct project domain
 */
function mapToProjectDomain(incomingDomain: string | undefined, host: string): string | undefined {
  // Check if the host matches any mapping
  for (const [adminDomain, projectDomain] of Object.entries(DOMAIN_MAPPINGS)) {
    if (host.includes(adminDomain)) {
      console.log(`✅ Host mapped: ${host} -> ${projectDomain}`);
      return projectDomain;
    }
  }
  
  // Check if incoming domain matches any mapping
  if (incomingDomain) {
    for (const [adminDomain, projectDomain] of Object.entries(DOMAIN_MAPPINGS)) {
      if (incomingDomain.includes(adminDomain)) {
        console.log(`✅ Domain mapped: ${incomingDomain} -> ${projectDomain}`);
        return projectDomain;
      }
    }
  }
  
  // No mapping found, return as-is
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
