import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
export const LUCKY_DRAW_BACKEND_BASE = `${RAW_BACKEND_URL.replace(/\/$/, '')}/api/v1/admin/lucky-draw`;

export function luckyDrawMockEnabled(): boolean {
  return process.env.LUCKY_DRAW_USE_MOCK === '1' || process.env.LUCKY_DRAW_USE_MOCK === 'true';
}

export async function proxyLuckyDraw(
  request: NextRequest,
  upstreamPath: string,
  init?: RequestInit,
): Promise<NextResponse | null> {
  if (luckyDrawMockEnabled()) return null;

  const authHeader = request.headers.get('authorization');
  const search = request.nextUrl.search || '';
  const url = `${LUCKY_DRAW_BACKEND_BASE}${upstreamPath}${search}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }
    return NextResponse.json(data ?? { status: 'error', message: 'Empty lucky draw response' }, {
      status: response.status,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return jsonError(
      timedOut ? 'Lucky draw API timed out' : 'Lucky draw API unreachable',
      timedOut ? 'upstream_timeout' : 'upstream_unreachable',
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ status: 'success', data }, { status });
}

export function jsonError(message: string, code?: string, status = 400) {
  return NextResponse.json(
    { status: 'error', message, ...(code ? { code } : {}) },
    { status },
  );
}
