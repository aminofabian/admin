import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/companies/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET companies request:', {
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

    console.log('📥 Companies response status:', response.status);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Company proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch companies',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const contentType = request.headers.get('content-type') || '';

    // Check if it's FormData (multipart/form-data) or JSON
    const isFormData = contentType.includes('multipart/form-data');
    
    let body: FormData | string;
    const headers: HeadersInit = {
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    if (isFormData) {
      // For FormData, pass it directly (don't set Content-Type, browser will set it with boundary)
      body = await request.formData();
    } else {
      // For JSON, parse and stringify
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/companies/`, {
      method: 'POST',
      headers,
      body: body as BodyInit,
      credentials: 'include',
    });

    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    // Log error details for debugging
    if (!response.ok) {
      console.error('❌ Company creation failed:', {
        status: response.status,
        statusText: response.statusText,
        body: data,
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Company proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create company',
      },
      { status: 500 },
    );
  }
}

