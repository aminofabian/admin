import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    
    // Extract game_id from body for query parameter
    const gameId = body.game_id;
    
    // Forward directly to the Django backend
    // The endpoint expects game_id as a query parameter
    const backendUrl = `${BACKEND_URL}/api/v1/players/check-balance-admin/${gameId ? `?game_id=${gameId}` : ''}`;

    console.log('🔷 Proxy Configuration:');
    console.log('  - BACKEND_URL:', BACKEND_URL);
    console.log('  - Full backend URL:', backendUrl);
    console.log('📤 Request Details:');
    console.log('  - Request body:', body);
    console.log('  - Auth header:', authHeader ? authHeader.substring(0, 30) + '...' : 'Missing');

    // Create AbortController for timeout (60 seconds for game API calls)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

    try {
      // Forward the POST request with Bearer token
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 Backend response status:', response.status);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!isJson) {
        const text = await response.text();
        console.log('📥 Backend returned non-JSON:', text.substring(0, 1000));
        
        return NextResponse.json(
          { 
            status: 'error', 
            message: 'Backend returned invalid response',
            details: text.substring(0, 1000)
          },
          { status: response.status }
        );
      }

      // Parse the response
      const data = await response.json();
      console.log('📥 Backend response data:', data);

      // Always return 200 to Next.js, but include the backend status in the body
      // This prevents CORS issues while still allowing the client to handle errors
      return NextResponse.json({
        ...data,
        _status: response.status,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle timeout/abort errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ Request timeout after 60 seconds');
        return NextResponse.json(
          { 
            status: 'error', 
            message: 'Request timeout. The game provider\'s API is taking too long to respond. Please try again.',
            _status: 408,
          },
          { status: 200 } // Return 200 to avoid CORS issues
        );
      }
      
      // Re-throw other errors to be handled by outer catch
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Check player game balance proxy error:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process check player game balance request',
        _status: 500,
      },
      { status: 500 }
    );
  }
}

