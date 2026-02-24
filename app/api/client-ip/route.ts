import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const ip =
    xForwardedFor?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return NextResponse.json({ ip });
}
