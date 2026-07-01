# Admin Chat Mixing Bug — Investigation Notes

**Project:** `admindashboard` (React admin dashboard)  
**Generated:** 2026-07-01  
**Status:** Scoped, not yet fixed

---

## Executive Summary

Support chats are **not mixed in the backend/database**. Each player has one isolated room (`P{player_id}Chat`). The mixing happens in the React admin client because `player.id` is being used as `chatroom_id` in REST API calls.

There is also a stale-async-response bug in the purchase/cashout sidebar hooks, plus a few smaller related issues.

---

## 1. Primary Bug: `player.id` vs `chatroom_id` Collision

### Root cause

`ChatUser.id` is meant to hold the **chatroom ID**, but the mapping function falls back to the **player ID** when `chatroom_id` is missing from the backend row.

**File:** `lib/chat/map-chat-api.ts` (lines 485–490)

```typescript
const directoryId =
  row.chatroom_id ??
  row.chat_id ??
  row.chatroomId ??
  row.id ??                       // ← player id fallback (WRONG)
  (resolvedUserId > 0 ? resolvedUserId : '');
```

When `chatroom_id` is absent, `directoryId` becomes `row.id`, which is the player's user id. The function then returns:

```typescript
return {
  id: String(directoryId),        // now equals player id
  user_id: resolvedUserId,        // also equals player id
  ...
};
```

### Why this mixes messages

The rest of the UI treats `ChatUser.id` as the chatroom ID. For example:

- `components/chat/chat-component.tsx` (lines 396–398)
  ```typescript
  const { ... } = useChatWebSocket({
    userId: selectedPlayer?.user_id ?? null,
    chatId: selectedPlayer?.id ?? null, // ← assumed chatroom_id, can be player.id
    ...
  });
  ```

- `hooks/use-chat-websocket.ts` (lines 331–336)
  ```typescript
  if (chatId) {
    params.append("chatroom_id", chatId); // ← can be player.id
  }
  if (userId) {
    params.append("user_id", String(userId));
  }
  ```

The proxy `/api/chat-messages` uses `chatroom_id` when present, so a corrupted `chatId` loads another player's history.

### Real-world collision

| Player | player_id | chatroom_id |
|---|---|---|
| MattyG2108 | 3648 | 3603 |
| jeffery30 | 3694 | **3648** |

If MattyG2108's row lacks `chatroom_id`, the UI calls `recent_messages?chatroom_id=3648`, which loads jeffery30's messages while the header still shows MattyG2108.

### Search-to-chat is the highest-risk path

Search results often come through `mapAdminSearchRowToChatUser` → `transformPlayerToUser`. If the search row does not include `chatroom_id`, the selected player object is corrupted and every subsequent REST call targets the wrong room.

**Related file:** `components/chat/chat-component.tsx` (lines 764, 2787–2808)

---

## 2. Secondary Bug: Stale Async Responses

### Root cause

The purchase and cashout sidebar hooks fire a fetch when `chatroomId` changes but do not abort in-flight requests or ignore stale responses.

**Files:**

- `hooks/use-player-purchases.ts` (lines 33–60)
- `hooks/use-player-cashouts.ts` (lines 33–60)

```typescript
useEffect(() => {
  if (!chatroomId) {
    setPurchases([]);
    return;
  }

  const fetchPurchases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await playersApi.purchases(chatroomId); // ← no abort / no token
      const activePurchases = data.filter((p) => p.status !== 'completed');
      setPurchases(activePurchases);
    } catch (err) { ... }
    finally { setIsLoading(false); }
  };

  fetchPurchases();
}, [chatroomId]);
```

### Impact

When an admin switches players rapidly (especially after a search), a slow response for the previously selected player can arrive after the new player is selected and overwrite the new player's data.

### Note on message history

`useChatWebSocket` has a `historyRequestRef` token check (`hooks/use-chat-websocket.ts` lines 415–428 and 574–578), so stale message responses are mostly ignored. However, it still does not abort the underlying fetch request.

---

## 3. Additional Related Issues

### 3.1 Purchases list reads the wrong response field

**File:** `lib/api/users.ts` (lines 116–119)

```typescript
purchases: (chatroomId: string | number) => {
  return apiClient.get<{ pending_cashout: ChatPurchase[] }>('api/chat-purchases', {
    params: { chatroom_id: chatroomId },
  }).then(response => response.pending_cashout || []);
},
```

It reads `pending_cashout`, which is the cashouts response shape. The purchases list will appear empty unless the backend happens to return that field.

### 3.2 Send-message fallback uses player id as chatroom id

**File:** `app/api/chat-send/route.ts` (lines 35–45)

```typescript
const postmanBody = {
  chatroom_id: body.receiver_id, // ← receiver_id is player_id, not chatroom_id
  message: body.message,
};
```

If the backend rejects the user-id send format, the fallback posts to the wrong room whenever `chatroom_id !== player_id`.

### 3.3 `effectiveUserId` falls back to the chatroom id

**File:** `components/chat/chat-component.tsx` (lines 562, 595, 619)

```typescript
const effectiveUserId = msg.userId || selectedPlayer?.id;
```

`selectedPlayer?.id` is the chatroom id string, not the numeric user id. This corrupts purchase-notification grouping and balance tracking.

---

## 4. What Is Working Correctly

- **WebSocket room name** is built from `userId` (player id): `P${userId}Chat`  
  **File:** `hooks/use-chat-websocket.ts` (lines 706–713)
- **Message list is cleared synchronously** when the active chat changes.  
  **File:** `hooks/use-chat-websocket.ts` (lines 288–302)

---

## 5. Recommended Fixes

### 5.1 Fix the `ChatUser.id` fallback (highest priority)

**File:** `lib/chat/map-chat-api.ts` (lines 485–490)

Do not fall back to player ids for the chatroom id.

```typescript
const directoryId =
  row.chatroom_id ??
  row.chat_id ??
  row.chatroomId ??
  '';
```

If the row truly has no chatroom id, leave `id` empty and let REST callers fall back to `user_id`.

### 5.2 Defensive check in REST callers

**File:** `hooks/use-chat-websocket.ts` (lines 331–336 and similar)

Treat `chatId` as missing when it equals `userId`:

```typescript
const safeChatId = chatId && chatId !== String(userId) ? chatId : null;
if (safeChatId) params.append("chatroom_id", safeChatId);
if (userId) params.append("user_id", String(userId));
```

### 5.3 Add stale-response guards to purchase/cashout hooks

**Files:** `hooks/use-player-purchases.ts`, `hooks/use-player-cashouts.ts`

Use an `AbortController` or a request token, and ignore results after unmount/chatroom change:

```typescript
useEffect(() => {
  if (!chatroomId) { setPurchases([]); return; }
  const ac = new AbortController();
  let cancelled = false;

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const data = await playersApi.purchases(chatroomId, ac.signal);
      if (cancelled) return;
      setPurchases(data.filter((p) => p.status !== 'completed'));
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  };

  fetchPurchases();
  return () => { cancelled = true; ac.abort(); };
}, [chatroomId]);
```

### 5.4 Fix the purchases response field

**File:** `lib/api/users.ts` (lines 116–119)

Read the correct field (verify against the backend; likely `messages` or `purchases`):

```typescript
purchases: (chatroomId: string | number) => {
  return apiClient.get<{ purchases?: ChatPurchase[]; messages?: ChatPurchase[] }>('api/chat-purchases', {
    params: { chatroom_id: chatroomId },
  }).then(response => response.purchases ?? response.messages ?? []);
},
```

### 5.5 Fix the send-message fallback

**File:** `app/api/chat-send/route.ts` (lines 35–45)

Pass the real `chatroom_id` through the request body and use it in the fallback instead of `body.receiver_id`.

### 5.6 Fix `effectiveUserId`

**File:** `components/chat/chat-component.tsx` (lines 562, 595, 619)

```typescript
const effectiveUserId = msg.userId || selectedPlayer?.user_id;
```

---

## 6. Files to Audit

| File | Lines | Concern |
|---|---|---|
| `lib/chat/map-chat-api.ts` | 472–493 | `ChatUser.id` fallback to player id |
| `components/chat/chat-component.tsx` | 396–398, 562, 595, 619, 764, 2787–2808 | Passes `selectedPlayer.id` as chatroom id; user id fallback bug |
| `hooks/use-chat-websocket.ts` | 288–302, 331–336, 415–428, 506–509, 574–578, 706–713 | History/purchase fetch params; WS room name |
| `hooks/use-player-purchases.ts` | 33–60 | No abort / stale response |
| `hooks/use-player-cashouts.ts` | 33–60 | No abort / stale response |
| `lib/api/users.ts` | 116–126 | Purchases reads `pending_cashout` |
| `app/api/chat-send/route.ts` | 35–45 | Fallback uses `receiver_id` as chatroom id |
| `app/api/chat-messages/route.ts` | 22–25 | Proxy uses `chatroom_id` if present |
| `app/api/chat-purchases/route.ts` | 28–30 | Proxy uses `chatroom_id` if present |
| `app/api/chat-cashouts/route.ts` | 24–26 | Proxy uses `chatroom_id` if present |

---

## 7. Out of Scope

This investigation applies only to the React admin dashboard (`admindashboard/`). Legacy Django HTML chat templates in the backend repo are a separate deployment and were not reviewed.
