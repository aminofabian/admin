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
      { status: 'error', message: 'Banner ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/admin-banners/${id}/`, {
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
    console.error('❌ Admin-banners proxy (GET) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch admin banner',
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
      { status: 'error', message: 'Banner ID is required' },
      { status: 400 },
    );
  }

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

    const response = await fetch(`${BACKEND_URL}/api/v1/admin-banners/${id}/`, {
      method: 'PATCH',
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
    console.error('❌ Admin-banners proxy (PATCH) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update admin banner',
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
      { status: 'error', message: 'Banner ID is required' },
      { status: 400 },
    );
  }

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

    const response = await fetch(`${BACKEND_URL}/api/v1/admin-banners/${id}/`, {
      method: 'PUT',
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
    console.error('❌ Admin-banners proxy (PUT) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update admin banner',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Banner ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/admin-banners/${id}/`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (response.status === 204 || response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Admin-banners proxy (DELETE) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete admin banner',
      },
      { status: 500 },
    );
  }
}
