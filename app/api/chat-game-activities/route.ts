import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy for JWT-authenticated endpoint: /api/v1/admin/chat/?request_type=game_activities
 * Proxies from same-origin to avoid CORS when calling backend from the browser.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    const params = new URLSearchParams({ request_type: 'game_activities' });
    if (userId) params.set('user_id', userId);
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?${params.toString()}`;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      }, { status: 401 });
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        return NextResponse.json({
          status: 'error',
          message: 'Authentication failed. Please log in again.',
          detail: 'JWT token is invalid or expired.',
        }, { status: 401 });
      }
      if (response.status === 404) {
        return NextResponse.json({ status: 'success', results: [], count: 0 });
      }
      return NextResponse.json(
        {
          status: 'error',
          message: `Backend error: ${response.status} ${response.statusText}`,
          detail: errorText.substring(0, 200),
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying game activities request:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch game activities',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
