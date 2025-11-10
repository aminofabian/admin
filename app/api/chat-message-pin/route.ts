import { NextRequest, NextResponse } from 'next/server';

type PinAction = 'pin' | 'unpin';

const ACTION_TO_REQUEST_TYPE: Record<PinAction, 'pin_message' | 'unpin_message'> = {
  pin: 'pin_message',
  unpin: 'unpin_message',
};

interface PinRequestBody {
  chat_id?: number;
  message_id?: number;
  action?: PinAction;
}

const resolvePositiveInteger = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.floor(numeric);
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PinRequestBody;
    const chatId = resolvePositiveInteger(body.chat_id);
    const messageId = resolvePositiveInteger(body.message_id);
    const action: PinAction = body.action === 'unpin' ? 'unpin' : 'pin';

    if (!chatId || !messageId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'chat_id and message_id must be positive integers',
        },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Authentication required',
        },
        { status: 401 },
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';
    const endpoint = `${backendUrl}/api/v1/admin/chat/?request_type=${ACTION_TO_REQUEST_TYPE[action]}`;

    const backendResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });

    const rawText = await backendResponse.text();
    let payload: any = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch (error) {
        console.error('❌ Failed to parse backend pin response:', error);
      }
    }

    if (!backendResponse.ok) {
      const message = payload?.message || payload?.detail || `Backend error ${backendResponse.status}`;
      return NextResponse.json(
        {
          status: 'error',
          message,
          detail: rawText.slice(0, 200),
        },
        { status: backendResponse.status },
      );
    }

    if (payload) {
      return NextResponse.json(payload);
    }

    return NextResponse.json({
      status: 'Success',
      message: action === 'pin' ? 'Message pinned successfully' : 'Message unpinned successfully',
      is_pinned: action === 'pin',
    });
  } catch (error) {
    console.error('❌ Failed to toggle pinned state:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to toggle pinned message state',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

