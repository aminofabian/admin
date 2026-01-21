import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bruii.com';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/transaction-purchases/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET transaction-purchases request:', {
      backendUrl,
      hasAuth: !!authHeader,
      queryParams: Object.fromEntries(searchParams.entries()),
    });

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    console.log('📥 Transaction-purchases response status:', response.status);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Transaction-purchases proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch transaction purchases',
      },
      { status: 500 },
    );
  }
}
