import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

function inferProviderFromPaymentDetails(paymentDetails: unknown): string | undefined {
  if (!paymentDetails || typeof paymentDetails !== 'object') return undefined;
  const pd = paymentDetails as Record<string, unknown>;
  const raw = pd.provider_payment_method ?? pd.subcategory_payment_method;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  return undefined;
}

function normalizeCashoutTransactionRow(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };

  if (typeof out.amount === 'number') {
    out.amount = String(out.amount);
  }
  if (typeof out.bonus_amount === 'number') {
    out.bonus_amount = String(out.bonus_amount);
  }

  const createdAt = out.created_at ?? out.created;
  const updatedAt = out.updated_at ?? out.updated;
  if (typeof createdAt === 'string' && (out.created === undefined || out.created === null)) {
    out.created = createdAt;
  }
  if (typeof updatedAt === 'string' && (out.updated === undefined || out.updated === null)) {
    out.updated = updatedAt;
  }

  const providerStr = out.provider != null ? String(out.provider).trim() : '';
  if (!providerStr) {
    const inferred = inferProviderFromPaymentDetails(out.payment_details);
    if (inferred) {
      out.provider = inferred;
    }
  }

  const hasNewWinning =
    out.new_winning_balance !== undefined &&
    out.new_winning_balance !== null &&
    String(out.new_winning_balance).trim() !== '';

  if (!hasNewWinning) {
    const locked = out.new_locked_balance;
    if (locked !== undefined && locked !== null && String(locked).trim() !== '') {
      const lockedStr = String(locked);
      out.new_winning_balance = lockedStr;
      const hasPrevWinning =
        out.previous_winning_balance !== undefined &&
        out.previous_winning_balance !== null &&
        String(out.previous_winning_balance).trim() !== '';
      if (!hasPrevWinning) {
        out.previous_winning_balance = lockedStr;
      }
    }
  }

  return out;
}

function normalizeTransactionCashoutsPayload(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    const results = data.map((item) =>
      item && typeof item === 'object'
        ? normalizeCashoutTransactionRow(item as Record<string, unknown>)
        : item,
    );
    return {
      count: results.length,
      next: null,
      previous: null,
      results,
    };
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    const body = data as Record<string, unknown>;
    if (Array.isArray(body.results)) {
      const results = body.results.map((item) =>
        item && typeof item === 'object'
          ? normalizeCashoutTransactionRow(item as Record<string, unknown>)
          : item,
      );
      const count = typeof body.count === 'number' ? body.count : results.length;
      return {
        ...body,
        count,
        next: body.next === undefined ? null : body.next,
        previous: body.previous === undefined ? null : body.previous,
        results,
      };
    }
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/transaction-cashouts/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET transaction-cashouts request:', {
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

    console.log('📥 Transaction-cashouts response status:', response.status);

    const payload = normalizeTransactionCashoutsPayload(data);

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('❌ Transaction-cashouts proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch transaction cashouts',
      },
      { status: 500 },
    );
  }
}
