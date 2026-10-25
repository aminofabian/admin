import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';

export async function GET(request: NextRequest) {
  const proxied = await proxyLuckyDraw(request, '/cycles/history/');
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.listHistory());
}
