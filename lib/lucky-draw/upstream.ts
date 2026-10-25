import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
export const LUCKY_DRAW_BACKEND_BASE = `${RAW_BACKEND_URL.replace(/\/$/, '')}/api/v1/lucky-draw`;

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
  const url = `${LUCKY_DRAW_BACKEND_BASE}${upstreamPath}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);

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

    if (response.status === 404) return null;

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ status: 'success', data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ status: 'error', message }, { status });
}
