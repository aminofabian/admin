import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔷 Proxying login to:', `${BACKEND_URL}/users/login/`);
    console.log('📤 Request body:', { username: body.username, hasPassword: !!body.password });

    // Forward the request to the Django backend
    const response = await fetch(`${BACKEND_URL}/users/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    // Parse the response
    const data = await response.json();
    
    console.log('📥 Backend response data:', data);

    // Create the response
    const nextResponse = NextResponse.json({
      ...data,
      _status: response.status, // Include original status
    });

    //  CRITICAL: Forward ALL Set-Cookie headers from Django to browser
    // Django sends multiple cookies (sessionid, csrftoken, etc.)
    // Must use getSetCookie() to get all of them, not just the first one
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    
    if (setCookieHeaders.length > 0) {
      console.log(`🍪 Forwarding ${setCookieHeaders.length} session cookies to browser`);
      setCookieHeaders.forEach(cookie => {
        console.log('🍪 Cookie:', cookie.substring(0, 50) + '...');
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    } else {
      // Fallback to old method for older Node versions
      const singleCookie = response.headers.get('set-cookie');
      if (singleCookie) {
        console.log('🍪 Forwarding single session cookie (fallback method)');
        nextResponse.headers.set('Set-Cookie', singleCookie);
      } else {
        console.warn('⚠️ No Set-Cookie headers in Django response');
      }
    }

    return nextResponse;
  } catch (error) {
    console.error('❌ Login proxy error:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process login request',
        _status: 500,
      },
      { status: 500 }
    );
  }
}
