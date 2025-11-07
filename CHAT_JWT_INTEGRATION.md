# Chat JWT Authentication Integration

## Overview
This document describes the integration of the new JWT-authenticated `/api/v1/admin/chat/` endpoint into the chat component.

## Changes Made

### 1. API Constants Updated (`lib/constants/api.ts`)
Added the new JWT-authenticated endpoint to the API constants:

```typescript
CHAT: {
  LIST: 'api/chat-list',
  MESSAGES: 'api/chat-messages',
  PURCHASES: 'api/chat-purchases',
  ADMIN_CHAT: `${API_PREFIX}/admin/chat/`, // ✅ NEW: JWT-authenticated endpoint
  WEBSOCKET_BASE: '/ws/cschat/',
}
```

### 2. Chat Messages API Route (`app/api/chat-messages/route.ts`)
**What changed:**
- ✅ Migrated from session-based auth (`/admin/chat/`) to JWT auth (`/api/v1/admin/chat/`)
- ✅ Removed cookie forwarding (no longer needed)
- ✅ Added proper JWT authentication validation
- ✅ Removed HTML response checks (JWT endpoints return proper JSON)
- ✅ Enhanced error handling for 401 (authentication) errors

**Before:**
```typescript
// Old endpoint (session-based)
const apiUrl = `${backendUrl}/admin/chat/?chatroom_id=${chatroomId}...`;

// Forwarded both JWT and cookies
if (authHeader) headers['Authorization'] = authHeader;
if (cookieHeader) headers['Cookie'] = cookieHeader;
```

**After:**
```typescript
// New endpoint (JWT-based)
const apiUrl = `${backendUrl}/api/v1/admin/chat/?chatroom_id=${chatroomId}...`;

// Only JWT authentication required
if (authHeader) {
  headers['Authorization'] = authHeader;
} else {
  return 401 error; // No authentication
}
```

### 3. Purchase History API Route (`app/api/chat-purchases/route.ts`)
**What changed:**
- ✅ Migrated from session-based auth to JWT auth
- ✅ Same improvements as chat-messages route
- ✅ Consistent error handling across both endpoints

## Authentication Flow

### Before (Session-Based)
1. User logs in → Receives session cookie + JWT token
2. Frontend stores JWT in localStorage
3. Next.js API routes forward **both** JWT + cookies to backend
4. Backend validates **session cookie** (ignored JWT)
5. Returns HTML login page if cookie invalid

### After (JWT-Based)
1. User logs in → Receives JWT token
2. Frontend stores JWT in localStorage
3. Next.js API routes forward **only JWT** to backend
4. Backend validates **JWT token**
5. Returns proper JSON error responses (no HTML redirects)

## How JWT Authentication Works

### Frontend (Chat Component)
The chat component already uses JWT authentication correctly:

```typescript
// hooks/use-chat-websocket.ts & hooks/use-chat-users.ts
const token = storage.get(TOKEN_KEY); // Get JWT from localStorage

fetch('/api/chat-messages', {
  headers: {
    'Authorization': `Bearer ${token}`, // ✅ JWT sent in header
  }
});
```

### API Route (Next.js Middleware)
```typescript
// app/api/chat-messages/route.ts
const authHeader = request.headers.get('Authorization');

if (!authHeader) {
  return 401; // Authentication required
}

// Forward JWT to backend
fetch(`${backendUrl}/api/v1/admin/chat/...`, {
  headers: {
    'Authorization': authHeader, // ✅ JWT forwarded
  }
});
```

### Backend (Django)
```python
# Backend endpoint: /api/v1/admin/chat/
@jwt_required  # ✅ Validates JWT token
def admin_chat(request):
    # Access authenticated user from JWT
    user = request.user
    # ... chat logic
```

## Error Handling Improvements

### Authentication Errors (401)
**Before:** HTML login page returned  
**After:** Proper JSON error response

```json
{
  "status": "error",
  "message": "Authentication failed. Please log in again.",
  "detail": "JWT token is invalid or expired."
}
```

### Not Found Errors (404)
**Before:** Treated as auth error  
**After:** Returns empty messages array

```json
{
  "status": "success",
  "messages": [],
  "message": "No message history available."
}
```

## Testing Instructions

### 1. Test Message History Loading
1. Log in to the admin dashboard
2. Navigate to the chat section
3. Click on any player
4. Verify messages load correctly
5. Check browser console for JWT logs:
   ```
   🔵 Proxying chat messages request to: .../api/v1/admin/chat/...
   🔑 Authorization header: Bearer eyJ...
   📥 Backend response status: 200 OK
   ✅ Received X messages from backend
   ```

### 2. Test Purchase History
1. While in a chat, switch to "Purchases" tab
2. Verify purchase history loads
3. Check console logs (similar to above)

### 3. Test Authentication Failure
1. Clear localStorage: `localStorage.clear()`
2. Reload the page
3. Try to access chat
4. Should see authentication error
5. Log in again → Chat should work

### 4. Test Token Expiration
1. Use expired token (simulate by modifying localStorage)
2. Try to load chat
3. Should receive 401 error
4. User should be prompted to log in again

## Compatibility Notes

### WebSocket Authentication
WebSocket connections still use the URL parameter for authentication:
```typescript
const wsUrl = `${wsBaseUrl}/ws/cschat/${roomName}/?user_id=${adminId}`;
```

**Note:** WebSocket authentication may need to be updated to JWT in the future. Current implementation uses URL parameter which is less secure but works with existing backend.

### Fallback to REST API
If WebSocket connection fails, the system falls back to REST API:
```typescript
// In hooks/use-chat-websocket.ts
if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
  // Use WebSocket
} else {
  // ✅ Fallback to REST API with JWT
  fetch(`${API_BASE_URL}/api/v1/chat/send/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Security Improvements

### ✅ Benefits of JWT Authentication
1. **No cookie management** - Simpler, more secure
2. **Stateless** - Backend doesn't need session storage
3. **Cross-domain friendly** - Works with CORS
4. **Mobile-ready** - Easy to use in mobile apps
5. **Token expiration** - Built-in security mechanism

### ✅ JWT Best Practices Implemented
- Tokens stored in localStorage (not cookies)
- Authorization header used (not URL params)
- Proper error handling for expired tokens
- No sensitive data in tokens (only user ID)

## Debugging Tips

### Check JWT Token
```javascript
// In browser console
const token = localStorage.getItem('auth_token');
console.log('JWT Token:', token);

// Decode JWT (see payload)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('JWT Payload:', payload);
```

### Check Network Requests
1. Open DevTools → Network tab
2. Filter by "chat"
3. Check request headers → Should see `Authorization: Bearer ...`
4. Check response → Should be JSON (not HTML)

### Backend Logs
Check backend Django logs for:
```
✅ JWT authentication successful for user: admin@example.com
❌ JWT authentication failed: Token expired
❌ JWT authentication failed: Invalid signature
```

## Migration Checklist

- ✅ Updated API constants with new endpoint
- ✅ Migrated chat-messages route to JWT
- ✅ Migrated chat-purchases route to JWT
- ✅ Removed session cookie dependencies
- ✅ Added proper JWT validation
- ✅ Enhanced error handling
- ✅ Tested message loading
- ⏳ Test purchase history loading
- ⏳ Test authentication errors
- ⏳ Deploy to production

## Future Improvements

1. **WebSocket JWT Authentication**
   - Migrate WebSocket to use JWT tokens
   - Send token in initial handshake message
   - More secure than URL parameters

2. **Token Refresh**
   - Implement automatic token refresh
   - Silent re-authentication before token expires
   - Better UX (no sudden logouts)

3. **Rate Limiting**
   - Add rate limiting to chat endpoints
   - Prevent abuse of API
   - Based on JWT user ID

## Summary

The chat component now uses the new JWT-authenticated `/api/v1/admin/chat/` endpoint. This provides:
- ✅ Simpler authentication (no session cookies)
- ✅ Better security (stateless, token-based)
- ✅ Proper error handling (JSON responses)
- ✅ Mobile-ready architecture
- ✅ Better debugging (clear auth flow)

**No changes needed in the chat component** - it already uses JWT authentication correctly. Only the backend API routes were updated to use the new endpoint.

