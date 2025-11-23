import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy for REST API endpoint: /api/v1/admin/chat/?request_type=online_players
 * This endpoint uses JWT authentication
 * Returns the latest online players
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?request_type=online_players`;

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying online players request to:', apiUrl);
    console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');

    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required',
      }, { status: 401 });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };

    // Create AbortController for timeout (30 seconds for online players API)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle timeout/abort errors
      if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('timeout'))) {
        console.error('❌ Request timeout after 30 seconds');
        return NextResponse.json({
          status: 'error',
          message: 'Request timeout. The server is taking too long to respond. Please try again.',
          detail: 'Connection timeout after 30 seconds',
        }, { status: 408 });
      }
      
      // Handle connection errors
      if (fetchError instanceof Error && (fetchError.message.includes('fetch failed') || fetchError.message.includes('ConnectTimeoutError'))) {
        console.error('❌ Connection error:', fetchError.message);
        return NextResponse.json({
          status: 'error',
          message: 'Failed to connect to server. Please check your connection and try again.',
          detail: fetchError.message,
        }, { status: 503 });
      }
      
      // Re-throw other errors to be handled by outer catch
      throw fetchError;
    }

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText.substring(0, 500));
      
      if (response.status === 401) {
        return NextResponse.json({
          status: 'error',
          message: 'Authentication failed. Please log in again.',
          detail: 'JWT token is invalid or expired.',
        }, { status: 401 });
      }
      
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
    console.log(` Received online players data from backend:`, JSON.stringify(data).substring(0, 500));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying online players request:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch online players';
    let errorDetail = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorMessage = 'Request timeout. The server is taking too long to respond.';
        errorDetail = 'The request exceeded the timeout limit. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        errorMessage = 'Connection failed. Unable to reach the server.';
        errorDetail = 'Please check your network connection and try again.';
        statusCode = 503;
      }
    }
    
    return NextResponse.json({
      status: 'error',
      message: errorMessage,
      detail: errorDetail,
    }, { status: statusCode });
  }
}

