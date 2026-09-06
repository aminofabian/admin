import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    
    // Forward directly to the Django backend
    // Note: This is an admin endpoint, not a REST API endpoint
    const backendUrl = `${BACKEND_URL}/api/v1/transaction-action/`;

    console.log('🔷 Proxy Configuration:');
    console.log('  - BACKEND_URL:', BACKEND_URL);
    console.log('  - Full backend URL:', backendUrl);
    console.log('📤 Request Details:');
    console.log('  - Form data:', Object.fromEntries(formData.entries()));
    console.log('  - Auth header:', authHeader ? authHeader.substring(0, 30) + '...' : 'Missing');
    console.log('  - Auth header length:', authHeader?.length || 0);

    // Convert FormData to URLSearchParams for Django (like curl -d "txn_id=123&type=cancel")
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });

    console.log('📤 URL params:', params.toString());

    // Forward the POST request with Bearer token (like cURL example)
    const response = await fetch(backendUrl, {
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

    const isLimitExceeded =
      data &&
      typeof data === 'object' &&
      (data as { code?: unknown }).code === 'cashout_24h_limit_exceeded';
    const isExplicitError =
      data && typeof data === 'object' && (data as { status?: unknown }).status === 'error';

    // Preserve structured limit-exceeded / error payloads for the client.
    // Forward real backend HTTP status for 4xx (handoff expects 400 for limit exceeded).
    if (isLimitExceeded || isExplicitError || !response.ok) {
      console.error('❌ Backend returned error:', {
        backendStatus: response.status,
        errorData: data,
      });
      const body =
        data && typeof data === 'object'
          ? {
              status: 'error',
              ...data,
              code: (data as { code?: string }).code,
              message:
                (data as { message?: string }).message ||
                (data as { error?: string }).error ||
                'Failed to process transaction action',
            }
          : {
              status: 'error',
              message: 'Failed to process transaction action',
            };
      const clientStatus = isLimitExceeded
        ? response.status >= 400
          ? response.status
          : 400
        : response.status >= 400
          ? response.status
          : 200;
      return NextResponse.json(body, { status: clientStatus });
    }

    // Return the success response
    return NextResponse.json(data, {
      status: 200,
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

