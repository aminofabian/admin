import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz').replace(
  /\/$/,
  '',
);

/**
 * Refresh admin access JWT using SimpleJWT-style refresh token.
 * Tries common Cogniasys backend paths.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      refresh?: string;
    };
    const refresh = typeof body.refresh === 'string' ? body.refresh.trim() : '';

    if (!refresh) {
      return NextResponse.json(
        { status: 'error', message: 'refresh token is required' },
        { status: 400 },
      );
    }

    const candidates = [
      `${BACKEND_URL}/api/token/refresh/`,
      `${BACKEND_URL}/api/v1/token/refresh/`,
      `${BACKEND_URL}/users/token/refresh/`,
      `${BACKEND_URL}/auth/token/refresh/`,
    ];

    let lastStatus = 502;
    let lastBody = '';

    for (const url of candidates) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh }),
          signal: AbortSignal.timeout(10000),
        });

        lastStatus = response.status;
        lastBody = await response.text();

        if (!response.ok) {
          // 404 = wrong path; try next. Auth errors stop immediately.
          if (response.status === 404) continue;
          if (response.status === 401 || response.status === 403) {
            return NextResponse.json(
              { status: 'error', message: 'Refresh token expired or invalid' },
              { status: 401 },
            );
          }
          continue;
        }

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(lastBody) as Record<string, unknown>;
        } catch {
          continue;
        }

        const access =
          (typeof data.access === 'string' && data.access) ||
          (typeof data.token === 'string' && data.token) ||
          (data.auth_token &&
          typeof data.auth_token === 'object' &&
          typeof (data.auth_token as { access?: string }).access === 'string'
            ? (data.auth_token as { access: string }).access
            : null);

        if (!access) continue;

        const nextRefresh =
          (typeof data.refresh === 'string' && data.refresh) ||
          (data.auth_token &&
          typeof data.auth_token === 'object' &&
          typeof (data.auth_token as { refresh?: string }).refresh === 'string'
            ? (data.auth_token as { refresh: string }).refresh
            : undefined);

        return NextResponse.json({
          status: 'success',
          access,
          ...(nextRefresh ? { refresh: nextRefresh } : {}),
        });
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Token refresh failed',
        detail: lastBody.slice(0, 200),
      },
      { status: lastStatus || 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Token refresh failed',
      },
      { status: 500 },
    );
  }
}
