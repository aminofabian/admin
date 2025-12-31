import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bruii.com';
    const apiUrl = `${backendUrl}/api/v1/chat-links/`;

    const authHeader = request.headers.get('Authorization');

    console.log('🔵 Proxying chat links request to:', apiUrl);
    console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');

    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    };

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText.substring(0, 500));

      return NextResponse.json(
        {
          status: 'error',
          message: `Backend error: ${response.status} ${response.statusText}`,
          detail: errorText.substring(0, 200),
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log the response structure for debugging
    console.log('📦 Chat links response:', {
      isArray: Array.isArray(data),
      type: typeof data,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 'N/A',
    });

    // Ensure we always return an array
    const linksArray = Array.isArray(data) ? data : [];

    return NextResponse.json(linksArray);
  } catch (error) {
    console.error('❌ Error proxying chat links request:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch chat links',
      },
      { status: 500 }
    );
  }
}

