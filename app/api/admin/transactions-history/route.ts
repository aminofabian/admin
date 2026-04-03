import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

/**
 * v1 transactions-history returns `new_locked_balance` but not `previous_winning_balance` / `new_winning_balance`.
 * Tables and modals use the winning-balance fields for the "Winning" column.
 */
function normalizeTransactionHistoryRow(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };

  const createdAt = row.created_at ?? row.created;
  const updatedAt = row.updated_at ?? row.updated;
  if (typeof createdAt === 'string' && (out.created === undefined || out.created === null)) {
    out.created = createdAt;
  }
  if (typeof updatedAt === 'string' && (out.updated === undefined || out.updated === null)) {
    out.updated = updatedAt;
  }

  const hasNewWinning =
    row.new_winning_balance !== undefined &&
    row.new_winning_balance !== null &&
    String(row.new_winning_balance).trim() !== '';

  if (!hasNewWinning) {
    const locked = row.new_locked_balance;
    if (locked !== undefined && locked !== null && String(locked).trim() !== '') {
      const lockedStr = String(locked);
      out.new_winning_balance = lockedStr;
      const hasPrevWinning =
        row.previous_winning_balance !== undefined &&
        row.previous_winning_balance !== null &&
        String(row.previous_winning_balance).trim() !== '';
      if (!hasPrevWinning) {
        out.previous_winning_balance = lockedStr;
      }
    }
  }

  return out;
}

function normalizeTransactionsHistoryPayload(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const body = data as Record<string, unknown>;
  if (!Array.isArray(body.results)) return data;

  const count =
    typeof body.count === 'number' ? body.count : body.results.length;

  return {
    ...body,
    count,
    next: body.next === undefined ? null : body.next,
    previous: body.previous === undefined ? null : body.previous,
    results: body.results.map((item) => {
      if (!item || typeof item !== 'object') return item;
      return normalizeTransactionHistoryRow(item as Record<string, unknown>);
    }),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/transactions-history/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET transactions-history request:', {
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

    console.log('📥 Transactions-history response status:', response.status);

    const payload = normalizeTransactionsHistoryPayload(data);

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('❌ Transactions-history proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch transactions history',
      },
      { status: 500 },
    );
  }
}
