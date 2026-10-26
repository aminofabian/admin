import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';
import type { LuckyDrawCompanySettings } from '@/types/lucky-draw';

export async function GET(request: NextRequest) {
  const proxied = await proxyLuckyDraw(request, '/settings/');
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.getSettings());
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as Partial<LuckyDrawCompanySettings>;
  const proxied = await proxyLuckyDraw(request, '/settings/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.patchSettings(body));
}
