import { NextRequest, NextResponse } from 'next/server';

interface BackendUser {
  id?: number | string;
  user_id?: number | string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  profile_image?: string;
  is_online?: boolean;
  isOnline?: boolean;
  last_message?: string;
  lastMessage?: string;
  last_message_time?: string;
  lastMessageTime?: string;
  balance?: number | string;
  winning_balance?: number | string;
  winningBalance?: number | string;
  games_played?: number;
  gamesPlayed?: number;
  win_rate?: number;
  winRate?: number;
  phone?: string;
  mobile?: string;
  unread_count?: number;
  unreadCount?: number;
}

/**
 * Transform backend user data (snake_case) to frontend format (camelCase)
 */
function transformUser(backendUser: BackendUser) {
  return {
    id: String(backendUser.id || backendUser.user_id || ''),
    user_id: Number(backendUser.user_id || backendUser.id || 0),
    username: backendUser.username || backendUser.name || 'Unknown',
    email: backendUser.email || '',
    avatar: backendUser.avatar || backendUser.profile_image || undefined,
    isOnline: backendUser.is_online || backendUser.isOnline || false,
    lastMessage: backendUser.last_message || backendUser.lastMessage || undefined,
    lastMessageTime: backendUser.last_message_time || backendUser.lastMessageTime || undefined,
    balance: backendUser.balance !== undefined ? String(backendUser.balance) : undefined,
    winningBalance: backendUser.winning_balance || backendUser.winningBalance ? 
      String(backendUser.winning_balance || backendUser.winningBalance) : undefined,
    gamesPlayed: backendUser.games_played || backendUser.gamesPlayed || undefined,
    winRate: backendUser.win_rate || backendUser.winRate || undefined,
    phone: backendUser.phone || backendUser.mobile || undefined,
    unreadCount: backendUser.unread_count || backendUser.unreadCount || 0,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json(
      { status: 'error', message: 'user_id is required' },
      { status: 400 }
    );
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';
    const apiUrl = `${backendUrl}/ws/chatlist/?user_id=${userId}`;

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying chat list request to:', apiUrl);
    console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Only add Authorization header if it exists
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('❌ Backend returned error:', response.status, response.statusText);
      
      // Get the error response body for debugging
      const errorText = await response.text();
      console.error('❌ Backend error response body:', errorText.substring(0, 1000));
      console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Return empty list if backend endpoint doesn't exist yet
      if (response.status === 404) {
        console.warn('⚠️ Backend returned 404. URL:', apiUrl);
        console.warn('⚠️ Error body:', errorText);
        return NextResponse.json({
          status: 'success',
          users: [],
          message: `Backend returned 404 for ${apiUrl}. Check if endpoint exists.`,
        });
      }

      console.error('❌ Backend error response:', errorText.substring(0, 500));
      
      return NextResponse.json(
        { 
          status: 'error', 
          message: `Backend error: ${response.status} ${response.statusText}`,
          detail: errorText.substring(0, 200),
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend response received:', JSON.stringify(data).substring(0, 500));
    
    // Transform the response to match frontend expectations
    let transformedData = { ...data };
    
    // Handle different response formats
    if (data.users && Array.isArray(data.users)) {
      // Backend returns { users: [...] }
      transformedData = {
        status: 'success',
        users: data.users.map(transformUser),
        total: data.total || data.users.length,
      };
    } else if (Array.isArray(data)) {
      // Backend returns [...] directly
      transformedData = {
        status: 'success',
        users: data.map(transformUser),
        total: data.length,
      };
    } else if (data.data && Array.isArray(data.data)) {
      // Backend returns { data: [...] }
      transformedData = {
        status: 'success',
        users: data.data.map(transformUser),
        total: data.total || data.data.length,
      };
    } else {
      console.warn('⚠️ Unexpected backend response format:', data);
      transformedData = {
        status: 'success',
        users: [],
        message: 'Unexpected response format from backend',
      };
    }

    console.log(`✅ Returning ${transformedData.users?.length || 0} users to frontend`);
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('❌ Error proxying chat list request:', error);
    
    // Return empty list if backend is not available
    return NextResponse.json({
      status: 'success',
      users: [],
      message: 'Backend not available. Chat functionality will be enabled when backend is ready.',
    });
  }
}

