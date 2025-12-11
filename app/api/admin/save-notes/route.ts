import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bruii.com';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

interface SaveNotesRequestBody {
  notes?: string;
  player_id?: number;
}

interface BackendResponse {
  message?: string;
  detail?: string;
  status?: string;
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
    const body = (await request.json()) as SaveNotesRequestBody;
    const playerId = resolvePositiveInteger(body.player_id);
    const notes = body.notes ?? '';

    if (!playerId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'player_id must be a positive integer',
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

    const endpoint = `${BACKEND_URL}/api/v1/admin/save-notes/`;

    const backendResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        notes: notes,
        player_id: playerId,
      }),
    });

    const rawText = await backendResponse.text();
    let payload: unknown = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch (error) {
        console.error('❌ Failed to parse backend save-notes response:', error);
      }
    }

    if (!backendResponse.ok) {
      const backendPayload = payload as BackendResponse;
      const message = backendPayload?.message || backendPayload?.detail || `Backend error ${backendResponse.status}`;
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
      status: 'success',
      message: 'You have successfully saved your note',
      detail: 'You have successfully saved your note',
    });
  } catch (error) {
    console.error('❌ Failed to save notes:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to save notes',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
