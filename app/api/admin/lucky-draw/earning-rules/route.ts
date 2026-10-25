import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';
import type { CreateTicketEarningRuleRequest } from '@/types/lucky-draw';

export async function GET(request: NextRequest) {
  const proxied = await proxyLuckyDraw(request, '/earning-rules/');
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.listRules());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateTicketEarningRuleRequest;
  const proxied = await proxyLuckyDraw(request, '/earning-rules/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (proxied) return proxied;
  return jsonOk(luckyDrawMock.createRule(body), 201);
}
