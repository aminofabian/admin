import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonError, jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';

type RouteContext = { params: Promise<{ cycleId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { cycleId } = await context.params;
  const proxied = await proxyLuckyDraw(request, `/history/${cycleId}/`);
  if (proxied) return proxied;

  const id = Number(cycleId);
  if (!Number.isFinite(id)) {
    return jsonError('Invalid cycle id', 'invalid_cycle_id', 400);
  }

  const entry = luckyDrawMock.getHistoryDetail(id);
  if (!entry) {
    return jsonError('Cycle not found', 'not_found', 404);
  }
  return jsonOk(entry);
}
