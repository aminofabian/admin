'use client';

import { useState } from 'react';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';

interface DiagnosticJWT {
  exists: boolean;
  preview: string;
  length: number;
}

interface DiagnosticCookies {
  count: number;
  list: string[];
  raw: string[];
}

interface DiagnosticAPI {
  status?: number;
  statusText?: string;
  ok?: boolean;
  headers?: {
    contentType: string | null;
  };
  response?: unknown;
  error?: string;
}

interface DiagnosticResult {
  timestamp: string;
  jwt: DiagnosticJWT;
  cookies: DiagnosticCookies;
  api: DiagnosticAPI;
}

/**
 * 🔍 Authentication Diagnostic Component
 * 
 * Helps debug authentication issues by showing:
 * - Whether JWT token is present
 * - What cookies are set
 * - Test API connectivity
 */
export function AuthDiagnostic() {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);

    // Check JWT token
    const token = storage.get(TOKEN_KEY);
    const jwtData: DiagnosticJWT = {
      exists: !!token,
      preview: token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'MISSING',
      length: token?.length || 0,
    };

    // Check cookies
    const cookies = document.cookie.split(';').map(c => c.trim());
    const cookiesData: DiagnosticCookies = {
      count: cookies.length,
      list: cookies.map(c => {
        const [name] = c.split('=');
        return name;
      }),
      raw: cookies.filter(c => c), // Only non-empty
    };

    // Test API connectivity
    let apiData: DiagnosticAPI = {};
    try {
      const response = await fetch('/api/chat-messages?chatroom_id=1&per_page=1', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      apiData = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          contentType: response.headers.get('content-type'),
        },
      };

      if (response.ok) {
        const data = await response.json();
        apiData.response = data;
      } else {
        const errorText = await response.text();
        apiData.error = errorText.substring(0, 500);
      }
    } catch (error) {
      apiData = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const results: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      jwt: jwtData,
      cookies: cookiesData,
      api: apiData,
    };

    setDiagnosticResult(results);
    setIsLoading(false);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🔍 Authentication Diagnostics</h3>
        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>

      {diagnosticResult && (
        <div className="space-y-4">
          {/* JWT Token */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
            <h4 className="font-semibold mb-2 flex items-center">
              {diagnosticResult.jwt.exists ? '✅' : '❌'} JWT Token
            </h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
              {JSON.stringify(diagnosticResult.jwt, null, 2)}
            </pre>
          </div>

          {/* Cookies */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
            <h4 className="font-semibold mb-2 flex items-center">
              {diagnosticResult.cookies.count > 0 ? '✅' : '❌'} Browser Cookies ({diagnosticResult.cookies.count})
            </h4>
            <div className="space-y-2">
              <div>
                <strong className="text-sm">Cookie names:</strong>
                <div className="flex flex-wrap gap-2 mt-1">
                  {diagnosticResult.cookies.list.map((name: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-xs rounded"
                    >
                      {name || '(empty)'}
                    </span>
                  ))}
                </div>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                  Show raw cookies
                </summary>
                <pre className="mt-2 bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                  {diagnosticResult.cookies.raw.join('\n')}
                </pre>
              </details>
            </div>
          </div>

          {/* API Test */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
            <h4 className="font-semibold mb-2 flex items-center">
              {diagnosticResult.api.ok ? '✅' : '❌'} API Connectivity
            </h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
              {JSON.stringify(diagnosticResult.api, null, 2)}
            </pre>
          </div>

          {/* Recommendations */}
          <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded p-3">
            <h4 className="font-semibold mb-2">💡 Recommendations</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {!diagnosticResult.jwt.exists && (
                <li className="text-red-600 dark:text-red-400">
                  <strong>JWT Token Missing:</strong> Please log in again.
                </li>
              )}
              {diagnosticResult.cookies.count === 0 && (
                <li className="text-yellow-600 dark:text-yellow-400">
                  <strong>No Cookies Found:</strong> This might be expected if you&apos;re using JWT-only auth.
                </li>
              )}
              {!diagnosticResult.cookies.list.includes('sessionid') && 
               !diagnosticResult.cookies.list.includes('csrftoken') && (
                <li className="text-yellow-600 dark:text-yellow-400">
                  <strong>Django Session Cookies Missing:</strong> You may need to log out and log back in to get session cookies (sessionid, csrftoken).
                </li>
              )}
              {diagnosticResult.api.status === 401 && (
                <li className="text-red-600 dark:text-red-400">
                  <strong>API Authentication Failed (401):</strong> Log out and log back in to refresh your authentication.
                </li>
              )}
              {diagnosticResult.api.ok && (
                <li className="text-green-600 dark:text-green-400">
                  <strong>All Systems Operational:</strong> Your authentication is working correctly!
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {!diagnosticResult && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Click &quot;Run Diagnostics&quot; to check your authentication status
        </p>
      )}
    </div>
  );
}

