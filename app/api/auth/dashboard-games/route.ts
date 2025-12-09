import { NextResponse } from 'next/server';

const DASHBOARD_GAMES_URL = 'https://admin.serverhub.biz/users/dashboard-games/';

export async function POST(request: Request) {
  try {
    // Parse request body to get project_domain
    const body = await request.json();
    const projectDomain = body.project_domain;

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
