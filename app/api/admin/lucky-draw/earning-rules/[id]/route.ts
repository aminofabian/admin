import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonError, jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';
import type { CreateTicketEarningRuleRequest } from '@/types/lucky-draw';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<CreateTicketEarningRuleRequest>;
  const proxied = await proxyLuckyDraw(request, `/earning-rules/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (proxied) return proxied;

  const updated = luckyDrawMock.patchRule(Number(id), body);
  if (!updated) return jsonError('Rule not found', 404);
  return jsonOk(updated);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const proxied = await proxyLuckyDraw(request, `/earning-rules/${id}/`, {
    method: 'DELETE',
  });
  if (proxied) return proxied;

  const ok = luckyDrawMock.deleteRule(Number(id));
  if (!ok) return jsonError('Rule not found', 404);
  return jsonOk({ deleted: true });
}
