import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonError, jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';
import type { DrawType } from '@/types/lucky-draw';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { draw_type?: DrawType };
  const proxied = await proxyLuckyDraw(request, '/run/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (proxied) return proxied;

  if (!body.draw_type || (body.draw_type !== 'weekly' && body.draw_type !== 'monthly')) {
    return jsonError('draw_type must be weekly or monthly', 'invalid_draw_type', 400);
  }

  const result = luckyDrawMock.runDraw(body.draw_type);
  if ('error' in result) {
    return jsonError(result.error, result.code, result.status);
  }
  return jsonOk(result);
}
