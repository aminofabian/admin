import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/admin-banners/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET admin-banners request:', {
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

    console.log('📥 Admin-banners response status:', response.status);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Admin-banners proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch admin banners',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const contentType = request.headers.get('content-type') || '';

    const isFormData = contentType.includes('multipart/form-data');
    let body: FormData | string;
    const headers: HeadersInit = {
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    if (isFormData) {
      body = await request.formData();
    } else {
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/admin-banners/`, {
      method: 'POST',
      headers,
      body: body as BodyInit,
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Admin-banners proxy (POST) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create admin banner',
      },
      { status: 500 },
    );
  }
}
