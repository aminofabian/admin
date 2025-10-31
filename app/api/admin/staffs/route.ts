import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/staffs/`, {
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
    } catch (error) {
      data = { raw: text || null };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Staff proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create staff member',
      },
      { status: 500 },
    );
  }
}

