# Meta Pixel + CAPI Frontend Handoff — Scope

**Date:** 2026-08-26  
**Implementation repo:** `slotthingg` (player frontend)  
**Config / observability repo:** `admindashboard` (already has company Meta credentials + Meta CAPI event history)  
**Backend:** staging changes claimed done by Bimal (CompleteRegistration + first eligible Purchase CAPI, `meta_event` handoff)

This document scopes what the **player frontend** must do so browser Pixel events dedupe with server CAPI, and so Purchase Match Quality stops failing on missing `fbp` / `fbc` / IP / User-Agent.

---

## Problem (from Meta)

Meta reported:

- Purchase Event Match Quality ~**4.7/10**
- Purchase CAPI missing **fbc, fbp, IP, User-Agent**
- **100%** of Purchase CAPI events had incorrect/old timestamps (backend priority — claimed fixed in staging)
- CompleteRegistration **price/currency** formatting/missing-value issues (backend)
- Pixel + CAPI **deduplication** must use the **same `event_id` / `eventID`**

Root cause on our side (frontend audit):

1. CAPI was previously fired server-only with no browser attribution cookies.
2. **`slotthingg` has no Meta Pixel installed** (`fbq` / `fbevents.js` / `next/script` — zero usage). Without the Pixel base code, `_fbp` / `_fbc` cookies are never written, so “read cookies and send them” always yields empty.
3. All signup and deposit calls go through **Next.js server proxies**. A bare `fetch` to Django sees the **Node egress IP** and a **Node User-Agent**, not the player’s browser — unless we forward them.

---

## Goal (phase 1)

| Goal | Owner |
|------|--------|
| Install Meta Pixel base code per tenant | Frontend |
| Capture `_fbp`, `_fbc`, `fbclid`, page URL; send as `meta_tracking` on signup + payment initiation | Frontend |
| Forward real browser IP + User-Agent through Next proxies so backend CAPI can use them | Frontend (proxy) |
| Fire Pixel `CompleteRegistration` / `Purchase` using backend `meta_event` (exact `event_id`) | Frontend |
| Dedupe browser fires via `localStorage` (`meta-pixel:{event_id}`) | Frontend |
| Durable CAPI records, hashing, first-deposit eligibility, timestamps | Backend (staging) |
| Store pixel ID / CAPI token; view delivery logs | Admin (done) |
| UTM first-party reporting | **Out of scope** (phase 1) |

---

## Current state (audit)

### `admindashboard`

- Company fields: `meta_pixel_id`, `meta_capi_token`, ads credentials
- History → Meta CAPI event viewer (read-only)
- **No** player Pixel / signup / deposit flows

### `slotthingg`

| Area | Status |
|------|--------|
| Meta Pixel (`fbq`, `fbevents.js`) | **Missing** |
| `_fbp` / `_fbc` / `fbclid` read/send | **Missing** |
| `meta_tracking` on signup / payment | **Missing** |
| `meta_event` Pixel fire + localStorage dedupe | **Missing** |
| Cookie consent / privacy gate for Meta | **Missing** (no banner) |
| Signup attribution (`?ref=`, `?source=`) | Exists (`lib/auth/referral-source.ts`) — pattern to reuse for `fbclid` |
| Payment proxies (BTCPay / BinPay / Brenzi / Tierlock) | Exist; inject `ip_address` into body; **do not** forward `meta_tracking` or User-Agent; whitelist body fields |
| Taparcaida player deposit route | **Missing** (admin-only today) |
| Signup final create | `FormData` via `/api/auth/signup` → `/users/signup/`; response discarded (`Promise<void>`) |
| Deposit confirmation → browser | Async; confirmation arrives later via webhook. WS types have **no** `meta_event` |

---

## Contract (backend handoff — source of truth)

### Request: `meta_tracking` (optional)

Include on **signup** and **payment-initiation** JSON (or equivalent):

```json
{
  "meta_tracking": {
    "fbp": "fb.1.1234567890.browser-id",
    "fbc": "fb.1.1234567890.click-id",
    "fbclid": "fallback-click-id",
    "event_source_url": "https://tenant.example.com/?signup=true"
  }
}
```

Rules:

- Read **raw** `_fbp` / `_fbc` from cookies — **do not hash**
- `fbclid` only when `_fbc` is unavailable
- **Do not fabricate** missing values — omit the field
- **Do not** send IP / User-Agent in this object — backend captures from the HTTP request (requires proxy header forwarding in our architecture)
- `event_source_url` = actual frontend page where the action started (tenant domain)

### Response: `meta_event` (Pixel handoff)

Signup success may include:

```json
{
  "message": "User Created Successfully",
  "meta_event": {
    "name": "CompleteRegistration",
    "event_id": "registration_123",
    "params": {
      "value": 0.0,
      "currency": "USD",
      "status": "registered"
    }
  }
}
```

First eligible successful deposit only — on transaction REST and/or player WebSocket:

```json
{
  "meta_event": {
    "name": "Purchase",
    "event_id": "first_purchase_ABC123",
    "params": {
      "value": 20.0,
      "currency": "USD",
      "content_type": "product",
      "contents": [{ "id": "first_deposit", "quantity": 1 }]
    }
  }
}
```

- REST: `transaction.meta_event`
- WebSocket: `message.data.meta_event`
- Later deposits, pending, manual credits, excluded events → **no** `meta_event`

### Pixel fire (exact)

```js
const event = response.meta_event;
if (event && !localStorage.getItem(`meta-pixel:${event.event_id}`)) {
  fbq('track', event.name, event.params, { eventID: event.event_id });
  localStorage.setItem(`meta-pixel:${event.event_id}`, '1');
}
```

Do **not** generate a separate browser event ID. Case must match CAPI `event_id`.

---

## Architecture reality (must design for)

```
Browser  →  Next.js route (slotthingg)  →  Django API
              ↑
              Today: Node IP + Node UA unless we forward
```

### Signup path

1. Multi-step: email OTP → verify → optional phone → **`completeSignupRegistration`** (creates user)
2. Final call uses **`FormData`**, not JSON → `meta_tracking` must be a JSON-string field (or backend accepts JSON; needs agreement)
3. Entry points: `SimpleSignUp.tsx` (primary), legacy `SignUp.tsx` / OTP flows as applicable
4. `/signup` and `/register` redirect to homepage modal → `event_source_url` will often be `https://{tenant}/?signup=true` (acceptable)

### Deposit path

1. Client builds body in `usePurchaseModal.ts`
2. Proxies rebuild payload and **drop unknown fields** today:
   - `/api/payments/process` (BTCPay)
   - `/api/payments/binpay-payment`
   - `/api/payments/brenzi-payment`
   - `/api/payments/tierlock-payment`
3. Player leaves site for provider; **Purchase Pixel cannot fire at initiation** — only when backend returns `meta_event` after webhook confirmation
4. Delivery channels: WebSocket `message.data.meta_event` + REST transaction object (fallback when socket missed)

### Multi-tenant

Brands (e.g. playltc, bitslot, spincash, …) each need their own **Pixel ID**. Admin already stores `meta_pixel_id` per company. Frontend needs a **public** way to read it (recommended: `site-settings` response).

---

## Scope — in

### 1. Meta Pixel base install

- Load `fbevents.js` once per session
- `fbq('init', pixelId)` + `PageView`
- Pixel ID from: `site-settings.settings.meta_pixel_id` (preferred) with optional `NEXT_PUBLIC_META_PIXEL_ID` fallback for local/dev
- No Pixel init if ID missing

### 2. Attribution capture utilities

- Read `_fbp`, `_fbc` from `document.cookie`
- Capture `?fbclid=` on any landing; persist (localStorage) like `referral-source.ts`
- `buildMetaTracking()` → omit empty fields; respect consent gate
- Unit tests for cookie parse, fbclid persist, tracking builder, event-id dedupe

### 3. Signup wiring

- Attach `meta_tracking` on final create (`completeSignupRegistration` + `/api/auth/signup` proxy)
- Return + parse signup JSON; if `meta_event`, fire Pixel **before** redirect to dashboard
- Forward `X-Forwarded-For` / `X-Real-IP` + original `User-Agent` on signup proxy → Django

### 4. Payment initiation wiring

- Client: add `meta_tracking` to all four payment request bodies
- Proxies: pass `meta_tracking` through; keep existing `ip_address` behavior; forward User-Agent (and ensure IP reaches backend as today or via headers)
- Do **not** fire Purchase at payment initiation

### 5. Purchase Pixel delivery

- Extend WS message typing/handlers: if `message.data.meta_event`, fire Pixel once
- REST fallback: when transaction list/detail includes `meta_event`, fire once (same localStorage key)
- Never invent Purchase events client-side

### 6. Consent hook (minimal)

- Helper `isMetaTrackingAllowed()` — default allow until a consent banner exists; if explicitly denied, skip cookies + Pixel
- Privacy copy: tracking only when permitted; never fabricate IDs  
- Full CMP/banner UI is **optional follow-up** unless legal requires it before ship

### 7. Staging verification checklist

- Set `META_CAPI_TEST_EVENT_CODE` on backend staging
- Confirm matching browser/server pairs in Meta Test Events
- Remove test code before production
- Monitor diagnostics / EMQ over several days (historical scores do not update instantly)

---

## Scope — out (phase 1)

- UTM capture / first-party campaign reporting (`utm_source`, etc.)
- Admin dashboard Pixel changes (config + logs already exist)
- Inventing Taparcaida player deposit UI (confirm with backend if players use another path)
- Changing CompleteRegistration currency/value rules (backend)
- Purchase event timestamp fix (backend — verify in Test Events only)
- Meta Ads Manager campaign setup
- Full GDPR cookie banner product (unless required to ship)

---

## Assumptions (implement against these unless overridden)

| # | Assumption | Risk if wrong |
|---|------------|----------------|
| A1 | Installing the Pixel base code **is in scope** (nothing else works without it) | Empty fbp/fbc forever |
| A2 | Backend builds `fbc` from `fbclid` when cookie missing | Double-built or missing click id |
| A3 | `site-settings` will expose `meta_pixel_id` (or we use env fallback per deploy) | Multi-brand wrong pixel |
| A4 | Signup accepts `meta_tracking` as JSON string in FormData **or** we switch final signup to JSON | Field ignored silently |
| A5 | Proxies must forward browser IP + UA headers; body does not carry them | EMQ stays broken on IP/UA |
| A6 | Purchase `meta_event` appears on player WS `data` and/or transaction REST | Pixel Purchase never fires |
| A7 | No consent banner yet → allow tracking by default with deny hook | Legal/compliance gap |
| A8 | Taparcaida not initiated from player app in phase 1 | Missing provider coverage |

---

## Open questions (blockers / confirmations)

1. **Is Meta Pixel installed anywhere outside this repo** (GTM, Cloudflare, partner)? If yes, coordinate to avoid double PageView / double events.
2. **Will `/api/v1/site-settings/` return `meta_pixel_id`?** Needed for multi-tenant init.
3. **Signup body shape:** FormData JSON-string field vs change to JSON API?
4. **Exact Purchase WebSocket shape** (`type`, path of `meta_event`) and **which REST endpoint** keeps returning `meta_event` for late clients.
5. **Does backend construct `fbc` from `fbclid`?** Confirm format ownership.
6. **Taparcaida:** do players initiate deposits from the player site somehow?
7. **CompleteRegistration currency** for brand-new players — always non-null?
8. **Consent:** ship with default-allow hook, or must a banner land in the same PR?

---

## Proposed file map (`slotthingg`)

| Path | Responsibility |
|------|----------------|
| `lib/meta/types.ts` | `MetaTracking`, `MetaEvent` |
| `lib/meta/cookies.ts` | `_fbp` / `_fbc` / `fbclid` persist |
| `lib/meta/tracking.ts` | `buildMetaTracking`, consent gate |
| `lib/meta/pixel.ts` | `initMetaPixel`, `fireMetaPixelEvent`, dedupe |
| `lib/meta/proxy.ts` | IP/UA header helpers, sanitize `meta_tracking` |
| `app/components/Meta/MetaPixelProvider.tsx` | Load pixel + capture fbclid on mount |
| `lib/auth/signup-flow.ts` | Attach tracking; return `meta_event` |
| `app/api/auth/signup/route.ts` | Forward headers; pass `meta_tracking` |
| `app/components/Auth/SimpleSignUp.tsx` | Fire CompleteRegistration Pixel |
| `PurchaseModal/hooks/usePurchaseModal.ts` | Attach `meta_tracking` |
| `app/api/payments/*/route.ts` | Pass through `meta_tracking`; forward UA |
| `NotificationWebSocketContext.tsx` | Fire Purchase when `data.meta_event` present |
| `lib/site-settings.ts` | Read optional `meta_pixel_id` |
| `.env.example` | `NEXT_PUBLIC_META_PIXEL_ID` (dev fallback) |
| Tests for pure helpers | Cookie / tracking / dedupe |

---

## Delivery phases

### Phase A — Foundation (unblocks Meta cookies)

1. Meta module + tests  
2. Pixel provider + site-settings / env pixel ID  
3. fbclid capture on all landings  

### Phase B — Signup

1. Proxy header forwarding  
2. `meta_tracking` on final signup  
3. Fire CompleteRegistration from `meta_event`  

### Phase C — Deposits

1. `meta_tracking` on all four payment clients + proxies  
2. WS (+ REST fallback) Purchase Pixel fire  

### Phase D — Verify

1. Staging Test Events with test event code  
2. Confirm matching event IDs browser ↔ server  
3. Remove test code; monitor EMQ  

---

## Acceptance criteria

- [ ] Pixel base code loads on tenant domains when pixel ID is configured  
- [ ] Ad click with `fbclid` persists across navigation to signup/deposit  
- [ ] Signup request includes `meta_tracking` when cookies/params exist; omits when not  
- [ ] Signup response `meta_event` fires Pixel once with matching `eventID`  
- [ ] Payment initiation includes `meta_tracking` for BTCPay, BinPay, Brenzi, Tierlock  
- [ ] Django receives browser IP + User-Agent (not Node defaults) on signup + payment init  
- [ ] First eligible deposit surfaces `meta_event`; Pixel Purchase fires once; later deposits do not  
- [ ] Refresh / re-delivery does not double-fire (localStorage dedupe)  
- [ ] Meta Test Events shows paired browser + server events for registration and first purchase  
- [ ] No fabricated fbp/fbc/fbclid; consent deny path skips tracking  

---

## What admin does **not** need for phase 1

No code changes required in `admindashboard` for the Pixel handoff itself. Use existing:

- Company Meta credentials (pixel ID / CAPI token)  
- History → Meta CAPI for delivery troubleshooting  

Optional later: surface EMQ / missing-parameter diagnostics in the Meta CAPI detail UI.

---

## Next step

Confirm open questions (especially A1–A6 / Q1–Q4), then implement Phase A → D in `slotthingg`.
