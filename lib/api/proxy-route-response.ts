import { NextResponse } from 'next/server';
import { isProxyAbort, ProxyNetworkError, ProxyTimeoutError } from './proxy-fetch';

/**
 * Turn a `proxyFetch` rejection into the response the chat UI expects.
 *
 * Keeps the three outcomes distinct, which the UI and the operator both depend
 * on: a cancellation (nobody left to answer), a timeout (retryable, upstream
 * slow), and a genuine upstream/network failure.
 */
export function proxyErrorResponse(error: unknown, label: string): NextResponse {
  // The browser hung up (typed another character, navigated away). The upstream
  // request is already cancelled and there is no client left to answer.
  if (isProxyAbort(error)) {
    return NextResponse.json(
      { status: 'error', message: 'Request cancelled' },
      { status: 499 },
    );
  }

  if (error instanceof ProxyTimeoutError) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'The server is taking too long to respond. Please try again.',
        request_id: error.requestId,
      },
      { status: 504 },
    );
  }

  if (error instanceof ProxyNetworkError) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Could not reach the server. Please try again.',
        request_id: error.requestId,
      },
      { status: 502 },
    );
  }

  console.error(`[${label}] unexpected proxy failure:`, error);
  return NextResponse.json(
    { status: 'error', message: 'Request failed. Please try again.' },
    { status: 500 },
  );
}
