import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bruii.com';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

/**
 * API Proxy for fetching full player details
 * Uses /api/v1/players/{id}/ which returns complete player data including username, email, balance, etc.
 * This is different from /api/v1/view-player/{id}/ which only returns transaction totals.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: playerId } = await params;
        const authHeader = request.headers.get('authorization');

        const backendUrl = `${BACKEND_URL}/api/v1/players/${playerId}/`;

        console.log('🔷 Proxying GET player-details request:', {
            backendUrl,
            playerId,
            hasAuth: !!authHeader,
        });

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
        });

        const text = await response.text();
        let data: unknown;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = { raw: text || null };
        }

        console.log('📥 Player-details response status:', response.status);

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('❌ Player-details proxy (GET) error:', error);

        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to fetch player details',
            },
            { status: 500 },
        );
    }
}
