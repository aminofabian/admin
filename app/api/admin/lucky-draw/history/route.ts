import { NextRequest } from 'next/server';
import { luckyDrawMock } from '@/lib/lucky-draw/mock-store';
import { jsonOk, proxyLuckyDraw } from '@/lib/lucky-draw/upstream';
import type { DrawType } from '@/types/lucky-draw';

export async function GET(request: NextRequest) {
  const proxied = await proxyLuckyDraw(request, '/history/');
  if (proxied) return proxied;

  const drawType = request.nextUrl.searchParams.get('draw_type') as DrawType | null;
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;

  return jsonOk(
    luckyDrawMock.listHistory({
      drawType: drawType === 'weekly' || drawType === 'monthly' ? drawType : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    }),
  );
}
