import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/payment-methods-management/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET payment-methods-management request:', {
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

    console.log('📥 Payment-methods-management response status:', response.status);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Payment-methods-management proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch payment methods management',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const backendUrl = `${BACKEND_URL}/api/v1/payment-methods-management/`;

    console.log('🔷 Proxying POST payment-methods-management request:', {
      backendUrl,
      hasAuth: !!authHeader,
      body,
    });

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    console.log('📥 Payment-methods-management response status:', response.status);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Payment-methods-management proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process payment methods management',
      },
      { status: 500 },
    );
  }
}
