import { NextRequest, NextResponse } from 'next/server';

const DASHBOARD_GAMES_URL = 'https://serverhub.biz/users/dashboard-games/';
const PROJECT_DOMAIN = process.env.NEXT_PUBLIC_PROJECT_DOMAIN || 'https://serverhub.biz';

export async function POST(request: NextRequest) {
  try {
    console.log('🔷 Proxying dashboard-games to:', DASHBOARD_GAMES_URL);
    console.log('📤 Project domain:', PROJECT_DOMAIN);

    // Forward the request to the external server
    const response = await fetch(DASHBOARD_GAMES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_domain: PROJECT_DOMAIN
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
    console.log('✅ Dashboard games response:', data);

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
