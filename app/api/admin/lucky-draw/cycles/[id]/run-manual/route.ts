import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonError, jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const proxied = await proxyLuckyDraw(request, `/cycles/${id}/run-manual/`, {
    method: 'POST',
    body: '{}',
  });
  if (proxied) return proxied;

  const result = luckyDrawMock.runManual(Number(id));
  if ('error' in result) {
    return jsonError(result.error, result.status);
  }
  return jsonOk(result);
}
