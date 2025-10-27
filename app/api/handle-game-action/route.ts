import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    
    // Forward directly to the Django backend (no trailing slash)
    const backendUrl = 'https://admin.serverhub.biz/admin/game-action/';

    console.log('🔷 Proxying to:', backendUrl);
    console.log('📤 Form data:', Object.fromEntries(formData.entries()));
    console.log('📤 Auth header:', authHeader ? 'Present' : 'Missing');

    // Convert FormData to URLSearchParams for Django (like curl -d "txn_id=123&type=cancel")
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });

    console.log('📤 URL params:', params.toString());

    // Use Bearer token approach like cURL (should bypass CSRF)
    // Try /admin/handle-game-action/ with Bearer token only
    const handleGameActionUrl = 'https://admin.serverhub.biz/admin/handle-game-action/';
    
    console.log('🔷 Trying handle-game-action URL:', handleGameActionUrl);

    // Forward the POST request with Bearer token (like cURL example)
    const response = await fetch(handleGameActionUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log('📥 Backend response status:', response.status);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!isJson) {
      // Read as text to see what we got
      const text = await response.text();
      console.log('📥 Backend returned non-JSON:', text.substring(0, 1000));
      console.log('📥 Full response text:', text);
      
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Backend returned invalid response',
          details: text.substring(0, 1000)
        },
        { status: response.status }
      );
    }

    // Get the response data as JSON
    const data = await response.json();
    console.log('📥 Backend response data:', data);

    // Return the response
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('❌ Proxy error details:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process request',
      },
      { status: 500 }
    );
  }
}

