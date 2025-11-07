# Chat Architecture - JWT Authentication Flow

## Before vs After

### ❌ Before (Session-Based Authentication)

```
┌─────────────────┐
│  Chat Component │
│  (React)        │
└────────┬────────┘
         │
         │ JWT + Cookies
         ▼
┌─────────────────┐
│  Next.js Route  │
│  /api/chat-*    │
└────────┬────────┘
         │
         │ JWT + Cookies
         ▼
┌─────────────────┐
│  Django Backend │
│  /admin/chat/   │
│  (Session Auth) │
└─────────────────┘
         │
         ├─ ✅ Valid Session → JSON Response
         └─ ❌ Invalid → HTML Login Page
```

**Problems:**
- Required both JWT AND session cookies
- Backend returned HTML on auth failure
- Complex authentication chain
- Not mobile-friendly
- Cookie management issues

---

### ✅ After (JWT-Based Authentication)

```
┌─────────────────┐
│  Chat Component │
│  (React)        │
└────────┬────────┘
         │
         │ JWT Only
         ▼
┌─────────────────┐
│  Next.js Route  │
│  /api/chat-*    │
└────────┬────────┘
         │
         │ JWT Only
         ▼
┌─────────────────┐
│  Django Backend │
│  /api/v1/admin/ │
│  chat/ (JWT)    │
└─────────────────┘
         │
         ├─ ✅ Valid JWT → JSON Response
         └─ ❌ Invalid → JSON Error
```

**Benefits:**
- ✅ Single authentication method (JWT)
- ✅ Consistent JSON responses
- ✅ Simpler authentication chain
- ✅ Mobile-ready
- ✅ No cookie management needed

---

## Complete Data Flow

### 1. Message History Request

```
User clicks on player
         │
         ▼
┌──────────────────────────────────────────┐
│ ChatComponent                            │
│ - selectedPlayer: Player                 │
│ - messages: Message[]                    │
└──────────────────┬───────────────────────┘
                   │
                   │ useChatWebSocket hook
                   ▼
┌──────────────────────────────────────────┐
│ fetchMessageHistory()                    │
│ - Get JWT from localStorage              │
│ - Call: /api/chat-messages               │
└──────────────────┬───────────────────────┘
                   │
                   │ Authorization: Bearer <JWT>
                   ▼
┌──────────────────────────────────────────┐
│ /app/api/chat-messages/route.ts         │
│ - Validate JWT exists                    │
│ - Forward to backend                     │
└──────────────────┬───────────────────────┘
                   │
                   │ Authorization: Bearer <JWT>
                   ▼
┌──────────────────────────────────────────┐
│ Backend: /api/v1/admin/chat/             │
│ ?chatroom_id=123                         │
│ &request_type=recent_messages            │
│ - Validate JWT                           │
│ - Fetch messages from DB                 │
└──────────────────┬───────────────────────┘
                   │
                   │ JSON: { messages: [...] }
                   ▼
┌──────────────────────────────────────────┐
│ Next.js Route                            │
│ - Returns JSON to frontend               │
└──────────────────┬───────────────────────┘
                   │
                   │ { messages: [...] }
                   ▼
┌──────────────────────────────────────────┐
│ useChatWebSocket hook                    │
│ - Transform messages                     │
│ - Update state: setMessages()            │
└──────────────────┬───────────────────────┘
                   │
                   │ messages array
                   ▼
┌──────────────────────────────────────────┐
│ ChatComponent                            │
│ - Renders messages                       │
│ - Groups by date                         │
│ - Shows avatars, timestamps              │
└──────────────────────────────────────────┘
```

### 2. Purchase History Request

```
User clicks "Purchases" tab
         │
         ▼
┌──────────────────────────────────────────┐
│ ChatComponent                            │
│ - chatViewMode: 'purchases'              │
└──────────────────┬───────────────────────┘
                   │
                   │ useChatWebSocket hook
                   ▼
┌──────────────────────────────────────────┐
│ fetchPurchaseHistory()                   │
│ - Get JWT from localStorage              │
│ - Call: /api/chat-purchases              │
└──────────────────┬───────────────────────┘
                   │
                   │ Authorization: Bearer <JWT>
                   ▼
┌──────────────────────────────────────────┐
│ /app/api/chat-purchases/route.ts        │
│ - Validate JWT exists                    │
│ - Forward to backend                     │
└──────────────────┬───────────────────────┘
                   │
                   │ Authorization: Bearer <JWT>
                   ▼
┌──────────────────────────────────────────┐
│ Backend: /api/v1/admin/chat/             │
│ ?chatroom_id=123                         │
│ &request_type=purchases_list             │
│ - Validate JWT                           │
│ - Fetch purchases from DB                │
└──────────────────┬───────────────────────┘
                   │
                   │ JSON: { messages: [...] }
                   ▼
┌──────────────────────────────────────────┐
│ useChatWebSocket hook                    │
│ - setPurchaseHistory()                   │
└──────────────────┬───────────────────────┘
                   │
                   │ purchaseHistory array
                   ▼
┌──────────────────────────────────────────┐
│ ChatComponent                            │
│ - Renders purchase cards                 │
│ - Shows HTML content (dangerouslySet)    │
└──────────────────────────────────────────┘
```

### 3. Send Message Flow

```
User types message & clicks Send
         │
         ▼
┌──────────────────────────────────────────┐
│ ChatComponent                            │
│ - handleSendMessage()                    │
└──────────────────┬───────────────────────┘
                   │
                   │ wsSendMessage(text)
                   ▼
┌──────────────────────────────────────────┐
│ useChatWebSocket hook                    │
│ - sendMessage(text)                      │
└──────────────────┬───────────────────────┘
                   │
                   ├─ WebSocket open?
                   │  ├─ Yes → Send via WebSocket
                   │  │         │
                   │  │         ▼
                   │  │    ┌───────────────┐
                   │  │    │ WebSocket     │
                   │  │    │ ws://backend/ │
                   │  │    │ cschat/       │
                   │  │    └───────────────┘
                   │  │
                   │  └─ No → Use REST API
                   │         │
                   │         ▼
                   │    ┌────────────────────┐
                   │    │ POST /api/v1/chat/ │
                   │    │ send/              │
                   │    │ Authorization: JWT │
                   │    └────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ Backend processes message                │
│ - Save to database                       │
│ - Broadcast to WebSocket clients         │
└──────────────────┬───────────────────────┘
                   │
                   │ WebSocket message
                   ▼
┌──────────────────────────────────────────┐
│ useChatWebSocket hook                    │
│ - Receive message via WebSocket          │
│ - Add to messages array                  │
│ - Call onMessageReceived callback        │
└──────────────────┬───────────────────────┘
                   │
                   │ Update UI
                   ▼
┌──────────────────────────────────────────┐
│ ChatComponent                            │
│ - Message appears in chat                │
│ - Updates chat list                      │
│ - Scrolls to bottom                      │
└──────────────────────────────────────────┘
```

---

## Error Handling Flow

### Authentication Error (401)

```
Frontend request with invalid/expired JWT
         │
         ▼
┌──────────────────────────────────────────┐
│ Next.js Route                            │
│ - Checks for Authorization header        │
│ - Missing? → Return 401                  │
│ - Present? → Forward to backend          │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ Backend validates JWT                    │
│ - Invalid signature? → 401               │
│ - Expired? → 401                         │
│ - Valid? → Process request               │
└──────────────────┬───────────────────────┘
                   │
                   │ 401 response
                   ▼
┌──────────────────────────────────────────┐
│ Next.js Route                            │
│ - Returns JSON error:                    │
│   {                                      │
│     status: 'error',                     │
│     message: 'Authentication failed',    │
│     detail: 'JWT token invalid'          │
│   }                                      │
└──────────────────┬───────────────────────┘
                   │
                   │ JSON error
                   ▼
┌──────────────────────────────────────────┐
│ Frontend (useChatWebSocket)              │
│ - Catch error                            │
│ - setConnectionError('Auth failed')      │
└──────────────────┬───────────────────────┘
                   │
                   │ Display error
                   ▼
┌──────────────────────────────────────────┐
│ ChatComponent                            │
│ - Shows error message                    │
│ - "Please log in again"                  │
└──────────────────────────────────────────┘
```

---

## JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 123,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "exp": 1699999999,  // Expiration timestamp
    "iat": 1699900000   // Issued at timestamp
  },
  "signature": "..."
}
```

**Storage:**
```javascript
localStorage.setItem('auth_token', 'eyJhbGciOi...');
```

**Usage:**
```javascript
const token = localStorage.getItem('auth_token');
headers['Authorization'] = `Bearer ${token}`;
```

---

## WebSocket Architecture (Separate from REST)

```
┌─────────────────┐
│  Chat Component │
└────────┬────────┘
         │
         │ useChatWebSocket hook
         ▼
┌─────────────────┐
│  WebSocket      │
│  Connection     │
└────────┬────────┘
         │
         │ ws://backend/ws/cschat/P{userId}Chat/?user_id={adminId}
         ▼
┌─────────────────┐
│  Django Backend │
│  WebSocket      │
│  Consumer       │
└─────────────────┘
         │
         ├─ 'message' event → Add to messages
         ├─ 'typing' event → Show typing indicator
         ├─ 'read' event → Mark message as read
         └─ 'live_status' event → Update online status
```

**Note:** WebSocket currently uses URL parameter authentication. This could be migrated to JWT in the future by sending the token in the initial handshake message.

---

## Summary

### Key Components

1. **ChatComponent** (`components/chat/chat-component.tsx`)
   - User interface for chat
   - No changes needed ✅

2. **useChatWebSocket** (`hooks/use-chat-websocket.ts`)
   - Manages WebSocket & REST API
   - Already uses JWT ✅

3. **useChatUsers** (`hooks/use-chat-users.ts`)
   - Manages user list
   - Already uses JWT ✅

4. **API Routes** (`app/api/chat-*/route.ts`)
   - Proxy requests to backend
   - **Updated to use new JWT endpoint** ✅

5. **Backend** (`/api/v1/admin/chat/`)
   - New JWT-authenticated endpoint
   - Created by Bimal ✅

### Authentication Method
- **Before:** Session cookies + JWT (redundant)
- **After:** JWT only (simpler, more secure)

### Response Format
- **Before:** HTML on error (session auth)
- **After:** JSON always (JWT auth)

