import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

/**
 * Backend may return `locked_balance` instead of `winning_balance`; dashboards use the latter.
 * Some payloads omit `count` when `results` is present — fill it for PaginatedResponse consumers.
 */
function normalizePlayersListResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const body = data as Record<string, unknown>;
  const results = body.results;
  if (!Array.isArray(results)) return data;

  const count =
    typeof body.count === 'number' ? body.count : results.length;

  const mappedResults = results.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const p = row as Record<string, unknown>;
    if (p.winning_balance !== undefined && p.winning_balance !== null) {
      return row;
    }
    const fallback = p.locked_balance ?? '0.00';
    return {
      ...p,
      winning_balance: typeof fallback === 'string' ? fallback : String(fallback),
    };
  });

  return {
    ...body,
    count,
    next: body.next === undefined ? null : body.next,
    previous: body.previous === undefined ? null : body.previous,
    results: mappedResults,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    const queryString = searchParams.toString();
    // Real backend route (v1). `/api/admin/players` is not deployed on all envs — do not use here.
    const backendUrl = `${BACKEND_URL}/api/v1/players/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET players request:', {
      backendUrl,
      hasAuth: !!authHeader,
      queryParams: Object.fromEntries(searchParams.entries()),
    });

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    console.log('📥 Players response status:', response.status);

    const payload = normalizePlayersListResponse(data);

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('❌ Player proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch players',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/players/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Player proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create player',
      },
      { status: 500 },
    );
  }
}

