import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

/**
 * `GET /api/v1/players/` returns DRF pagination: count, next, previous, results.
 * Each row includes balance, winning_balance, cashout_limit, locked_balance, etc.
 * If an older payload omits winning_balance, default to "0.00" (do not copy locked_balance).
 */
function normalizePlayersListResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const body = data as Record<string, unknown>;
  const results = body.results;
  if (!Array.isArray(results)) return data;

  const rawCount = body.count;
  const count =
    typeof rawCount === 'number'
      ? rawCount
      : typeof rawCount === 'string'
        ? Number.parseInt(rawCount, 10)
        : Number.NaN;
  const safeCount = Number.isFinite(count) ? count : results.length;

  const mappedResults = results.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const p = row as Record<string, unknown>;
    const wb = p.winning_balance;
    if (wb !== undefined && wb !== null && String(wb).trim() !== '') {
      return row;
    }
    return {
      ...p,
      winning_balance: '0.00',
    };
  });

  return {
    ...body,
    count: safeCount,
    next: body.next ?? null,
    previous: body.previous ?? null,
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

