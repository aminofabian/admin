import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';
import type { ManualDrawThresholds } from '@/types/lucky-draw';

export async function GET(request: NextRequest) {
  const proxied = await proxyLuckyDraw(request, '/manual-thresholds/');
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.getThresholds());
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as Partial<ManualDrawThresholds>;
  const proxied = await proxyLuckyDraw(request, '/manual-thresholds/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.patchThresholds(body));
}
