import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonError, jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';

type RouteContext = { params: Promise<{ winnerId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { winnerId } = await context.params;
  const proxied = await proxyLuckyDraw(request, `/winners/${winnerId}/credit/`, {
    method: 'POST',
    body: '{}',
  });
  if (proxied) return proxied;

  const id = Number(winnerId);
  if (!Number.isFinite(id)) {
    return jsonError('Invalid winner id', 'invalid_winner_id', 400);
  }

  const result = luckyDrawMock.creditWinner(id);
  if ('error' in result) {
    return jsonError(result.error, result.code, result.status);
  }
  return jsonOk(result);
}
