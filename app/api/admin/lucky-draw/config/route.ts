import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';
import type { LuckyDrawCompanyConfig } from '@/types/lucky-draw';

export async function GET(request: NextRequest) {
  const proxied = await proxyLuckyDraw(request, '/config/');
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.getConfig());
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as Partial<LuckyDrawCompanyConfig>;
  const proxied = await proxyLuckyDraw(request, '/config/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.patchConfig(body));
}
