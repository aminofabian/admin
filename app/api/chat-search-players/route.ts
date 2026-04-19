import { NextRequest, NextResponse } from 'next/server';
import { buildAdminChatSearchPlayersPathAndQuery } from '@/lib/constants/api';

/**
 * Proxies the browser to the external admin chat API (JWT):
 * GET /api/v1/admin/chat/?request_type=search_players&query=<search text>
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';

  if (!query) {
    return NextResponse.json(
      { status: 'ok', results: [], player: [], count: 0 },
      { status: 200 },
    );
  }

  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz').replace(/\/$/, '');
    const apiUrl = `${backendUrl}${buildAdminChatSearchPlayersPathAndQuery(query)}`;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { status: 'error', message: 'Authentication required' },
        { status: 401 },
      );
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
        return NextResponse.json(
          { status: 'error', message: 'Authentication required. Please re-login.', results: [] },
          { status: 401 },
        );
      }
      return NextResponse.json(
        {
          status: 'error',
          message: `Backend error: ${response.status} ${response.statusText}`,
          detail: errorText.substring(0, 200),
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying search_players:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to search players',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
