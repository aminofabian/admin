import { NextRequest, NextResponse } from 'next/server';
import { buildAdminChatSearchPlayersPathAndQuery } from '@/lib/constants/api';
import { createPlayerSearchCache } from '@/lib/chat/player-search-cache';
import {
  fingerprintSearchToken,
  isSearchAbortError,
  isSearchablePlayerQuery,
  normalizePlayerSearchQuery,
} from '@/lib/chat/player-search';
import { proxyFetch, ProxyNetworkError, ProxyTimeoutError } from '@/lib/api/proxy-fetch';
import { proxyErrorResponse } from '@/lib/api/proxy-route-response';

/**
 * Module-scoped so the cache survives across requests handled by the same
 * server instance. In a serverless runtime each cold start begins empty, which
 * is safe — it only means a miss.
 */
const searchCache = createPlayerSearchCache<unknown>();

const EMPTY_RESULT = { status: 'ok', results: [], player: [], count: 0 };

/**
 * Proxies the browser to the external admin chat API (JWT):
 * GET /api/v1/admin/chat/?request_type=search_players&query=<search text>
 *
 * The browser debounces, but without a cache every debounce window still costs
 * an upstream request. Identical queries are served from a short-lived cache,
 * concurrent identical queries share one request, and a query the client
 * abandons is aborted upstream.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const normalizedQuery = normalizePlayerSearchQuery(query);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json(
      { status: 'error', message: 'Authentication required' },
      { status: 401 },
    );
  }

  // A one-character query matches most of the player table: it is both slow and
  // useless. Answer it locally instead of spending a backend request on it.
  if (!isSearchablePlayerQuery(normalizedQuery)) {
    return NextResponse.json(EMPTY_RESULT, { status: 200 });
  }

  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz').replace(
    /\/$/,
    '',
  );
  const apiUrl = `${backendUrl}${buildAdminChatSearchPlayersPathAndQuery(query)}`;

  // Scope the cache per operator so cached rows never cross accounts.
  const cacheKey = `${fingerprintSearchToken(authHeader)}:${normalizedQuery}`;

  try {
    const data = await searchCache.resolve(
      cacheKey,
      async (signal) => {
        // The shared helper supplies the timeout; the cache's signal is passed as
        // the caller signal so an abandoned search cancels the upstream request
        // even though the cache may be shared by several callers.
        const response = await proxyFetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          callerSignal: signal,
          label: 'chat-search-players',
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          const error = new Error(
            `Backend error: ${response.status} ${response.statusText}`,
          ) as Error & {
            status?: number;
            detail?: string;
            isAuthError?: boolean;
          };
          error.status = response.status;
          error.detail = detail.substring(0, 200);
          error.isAuthError = response.status === 401;
          throw error;
        }

        return response.json();
      },
      request.signal,
    );

    return NextResponse.json(data);
  } catch (error) {
    // Timeout or unreachable upstream: a real, retryable failure.
    if (error instanceof ProxyTimeoutError || error instanceof ProxyNetworkError) {
      return proxyErrorResponse(error, 'chat-search-players');
    }

    // The client aborted (typed another character, or navigated away). The
    // upstream request is already cancelled; there is nobody left to answer.
    if (isSearchAbortError(error)) {
      return NextResponse.json(
        { status: 'error', message: 'Request cancelled' },
        { status: 499 },
      );
    }

    if (error instanceof Error && 'status' in error) {
      const status = (error as { status?: number }).status;
      const detail = (error as { detail?: string }).detail;
      const isAuthError = (error as { isAuthError?: boolean }).isAuthError;

      if (isAuthError) {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Authentication required. Please re-login.',
            results: [],
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          status: 'error',
          message: error.message,
          detail,
        },
        { status: status && status >= 400 ? status : 502 },
      );
    }

    console.error('Error proxying search_players:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to search players',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
