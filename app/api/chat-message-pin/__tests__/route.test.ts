import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/chat-message-pin/route';

const buildRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) => {
  const request = new Request('http://localhost/api/chat-message-pin', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  return NextRequest.from(request);
};

describe('POST /api/chat-message-pin', () => {
  const backendUrl = 'http://backend.local';

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = backendUrl;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards pin action to backend and returns payload', async () => {
    const mockResponse = {
      status: 'Success',
      message: 'Message pinned successfully',
      is_pinned: true,
    };

    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const request = buildRequest(
      { chat_id: 1, message_id: 326, action: 'pin' },
      { Authorization: 'Bearer token' },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${backendUrl}/api/v1/admin/chat/?request_type=pin_message`);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
    const parsedBody = JSON.parse((init?.body as string) ?? '{}');
    expect(parsedBody).toEqual({ chat_id: 1, message_id: 326 });
    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');
    const request = buildRequest({ chat_id: 1, message_id: 326, action: 'pin' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      status: 'error',
      message: 'Authentication required',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

