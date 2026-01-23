import { NextRequest, NextResponse } from 'next/server';

type RouteContextParams = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Company ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/companies/${id}/`, {
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

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Company proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch company',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Company ID is required' },
      { status: 400 },
    );
  }

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

    const response = await fetch(`${BACKEND_URL}/api/v1/companies/${id}/`, {
      method: 'PUT',
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
      console.error('❌ Company update failed:', {
        status: response.status,
        statusText: response.statusText,
        body: data,
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Company proxy (PUT) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update company',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Company ID is required' },
      { status: 400 },
    );
  }

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

    const response = await fetch(`${BACKEND_URL}/api/v1/companies/${id}/`, {
      method: 'PATCH',
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

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Company proxy (PATCH) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update company',
      },
      { status: 500 },
    );
  }
}

