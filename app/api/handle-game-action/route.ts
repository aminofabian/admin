import { NextRequest, NextResponse } from 'next/server';
import {
  appendSanitizedGameBalanceFields,
  appendSanitizedGameEntriesFields,
} from '@/lib/utils/game-action-payload';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';

function extractDjangoHtmlErrorMessage(html: string): string | null {
  const titleMatch = html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].replace(/\s+/g, ' ').trim();
    if (title) return title;
  }

  const exceptionMatch = html.match(
    /<pre class="exception_value">([\s\S]*?)<\/pre>/i,
  );
  if (exceptionMatch?.[1]) {
    return exceptionMatch[1].replace(/\s+/g, ' ').trim();
  }

  const h1Match = html.match(/<h1>\s*([^<]+?)\s*<\/h1>/i);
  if (h1Match?.[1]) {
    return h1Match[1].replace(/\s+/g, ' ').trim();
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    
    // Forward directly to the Django backend
    // Note: This is an admin endpoint, not a REST API endpoint
    const backendUrl = `${BACKEND_URL}/api/v1/game-action/`;

    console.log('🔷 Proxy Configuration:');
    console.log('  - BACKEND_URL:', BACKEND_URL);
    console.log('  - Full backend URL:', backendUrl);
    console.log('📤 Request Details:');
    console.log('  - Form data:', Object.fromEntries(formData.entries()));
    console.log('  - Auth header:', authHeader ? authHeader.substring(0, 30) + '...' : 'Missing');
    console.log('  - Auth header length:', authHeader?.length || 0);

    // Convert FormData to URLSearchParams for Django (like curl -d "txn_id=123&type=cancel")
    const params = new URLSearchParams();
    const rawBalance =
      formData.get('new_game_balance')?.toString() ??
      formData.get('new_balance')?.toString();
    const rawEntries =
      formData.get('new_entries')?.toString() ?? formData.get('entries')?.toString();

    formData.forEach((value, key) => {
      if (
        key === 'new_balance' ||
        key === 'new_game_balance' ||
        key === 'new_entries' ||
        key === 'entries'
      ) {
        return;
      }
      params.append(key, value.toString());
    });

    if (rawBalance) {
      appendSanitizedGameBalanceFields(params, rawBalance);
    }

    if (rawEntries) {
      appendSanitizedGameEntriesFields(params, rawEntries);
    }

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
      console.log('📥 Attempted URL:', backendUrl);
      
      const djangoMessage = extractDjangoHtmlErrorMessage(text);
      
      return NextResponse.json(
        { 
          status: 'error', 
          message: djangoMessage || 'Backend returned invalid response',
          details: text.substring(0, 1000),
          attemptedUrl: backendUrl,
          backendUrl: BACKEND_URL
        },
        { status: response.status }
      );
    }

    // Get the response data as JSON
    const data = await response.json();
    console.log('📥 Backend response data:', data);

    // If backend returned an error, forward it with detailed logging
    if (data.status === 'error') {
      console.error('❌ Backend returned error:', {
        backendStatus: response.status,
        errorData: data,
      });
      // Always return 200 with error in body so the client can handle it properly
      // Don't use backend's HTTP status as it causes confusion (404 looks like route not found)
      return NextResponse.json(data, { status: 200 });
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
