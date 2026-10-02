import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/api/proxy-fetch';
import { proxyErrorResponse } from '@/lib/api/proxy-route-response';

const ROUTE_LABEL = 'chat-messages';
import { buildUpstreamError, createErrorRequestId } from '@/lib/api/upstream-error';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatroomId = searchParams.get('chatroom_id');
  const userId = searchParams.get('user_id');
  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('per_page') || '10';

  // Accept either chatroom_id OR user_id
  if (!chatroomId && !userId) {
    return NextResponse.json(
      { status: 'error', message: 'chatroom_id or user_id is required' },
      { status: 400 }
    );
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    // Using new JWT-authenticated endpoint
    // Use chatroom_id if available, otherwise use user_id
    const identifierParam = chatroomId 
      ? `chatroom_id=${chatroomId}` 
      : `user_id=${userId}`;
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?${identifierParam}&request_type=recent_messages&page=${page}&per_page=${perPage}`;
    
    console.log('📍 Fetching messages with:', chatroomId ? `chatroom_id=${chatroomId}` : `user_id=${userId}`);

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying chat messages request to:', apiUrl);
    // Log presence only: a token prefix exposes the JWT header and payload
    // (user id, role, expiry) to whatever aggregates these logs.
    console.log('🔑 Authorization header:', authHeader ? 'present' : 'MISSING');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    //  Use JWT authentication (Authorization header)
    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else {
      console.warn('⚠️ No Authorization header provided');
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      }, { status: 401 });
    }

    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers,
      callerSignal: request.signal,
      label: ROUTE_LABEL,
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      const requestId = createErrorRequestId();
      const safe = buildUpstreamError(response.status, errorText, requestId);
      // Full upstream body is logged, never returned to the browser.
      console.error(`[chat-proxy ${requestId}] upstream ${response.status}:`, errorText);
      console.error('❌ Backend error response status:', response.status);
      console.error('❌ Backend error headers:', Object.fromEntries(response.headers.entries()));
      console.error('❌ Backend error body:', errorText.substring(0, 1000));
      
      if (response.status === 401) {
        return NextResponse.json({
          status: 'error',
          message: 'Authentication failed. Please log in again.',
          detail: 'JWT token is invalid or expired.',
        }, { status: 401 });
      }
      
      if (response.status === 404) {
        console.warn('⚠️ Backend returned 404. No message history found.');
        return NextResponse.json({
          status: 'success',
          messages: [],
          message: 'No message history available. This might be a new conversation.',
        });
      }
      
      return NextResponse.json(
        {
          status: 'error',
          message: safe.message,
          detail: safe.detail,
          request_id: safe.requestId,
          upstream_status: safe.upstreamStatus,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(` Received ${data.messages?.length || 0} messages from backend`);
    
    // Get the player ID from the request (user_id parameter is the player we're chatting with)
    const playerIdNum = userId ? parseInt(userId, 10) : null;
    
    // DEBUG: Log first few messages to see exact structure from backend
    if (data.messages && data.messages.length > 0) {
      console.log('🔍 BACKEND MESSAGE STRUCTURE - First 3 messages:');
      data.messages.slice(0, 3).forEach((msg: Record<string, unknown>, i: number) => {
        console.log(`  Message ${i + 1}:`, {
          id: msg.id,
          sender_id: msg.sender_id,
          is_player_sender: msg.is_player_sender,
          sender: msg.sender,
          message: typeof msg.message === 'string' ? msg.message.substring(0, 30) : msg.message,
        });
      });
      
      // FIX: Correct is_player_sender AND sender based on sender_id comparison with player's user_id
      // This fixes the backend bug where staff/manager messages appear on wrong side
      if (playerIdNum && playerIdNum > 0) {
        console.log(`🔧 Fixing message sender fields for player_id=${playerIdNum}`);
        data.messages = data.messages.map((msg: Record<string, unknown>) => {
          const senderId = typeof msg.sender_id === 'number' ? msg.sender_id : null;
          // If sender_id matches player_id, it's from player; otherwise it's from staff/admin
          const isFromPlayer = senderId === playerIdNum;
          
          // Set both is_player_sender AND sender field to ensure compatibility
          const correctedSender = isFromPlayer ? 'player' : 'admin';
          
          if (msg.sender !== correctedSender) {
            console.log(`  📝 Correcting msg ${msg.id}: sender_id=${senderId}, was sender="${msg.sender}", now="${correctedSender}"`);
          }
          
          return {
            ...msg,
            is_player_sender: isFromPlayer,
            sender: correctedSender, // Also fix sender field for cached client code
          };
        });
      }
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return proxyErrorResponse(error, 'chat-messages');
  }
}

