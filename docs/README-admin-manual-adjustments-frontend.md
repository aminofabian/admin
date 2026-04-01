# Admin manual adjustments — frontend plan

This document plans **admin UI and client-side behavior** for payment balance manual adjustments. Backend owns ledger rules, validation, and analytics aggregation; the frontend must **reflect** those rules, **prevent obvious mistakes**, and **display** the right labels in history.

**Related product spec (section 6):** Freeplay, External Deposit, External Cashout, Void — each with defined effects on `balance`, `cashout_limit`, `locked_balance` (where applicable), transaction history, and analytics.

---

## 1. Domain summary (what the UI must respect)

| Adjustment | Direction | `balance` | `cashout_limit` | `locked_balance` (Void) | History (type + method) | Analytics bucket |
|------------|-----------|-----------|-----------------|-------------------------|-------------------------|------------------|
| **Freeplay** | Add only | ↑ | unchanged | — | Add + **Freeplay** | Freeplay |
| **External Deposit** | Add only | ↑ | unchanged | — | Add + **External Deposit** | Purchase, method External Deposit |
| **External Cashout** | Deduct only | ↓ | ↓ (same as deduction) | — | Deduct + **External Cashout** | Cashout, method External Cashout |
| **Void** | Deduct only | ↓ | ↓ only if locked insufficient | **Locked-first:** reduce locked first | Deduct + **Void** + **reason** | Void |

**External Cashout constraint (client + server):** amount must be **≤ current `cashout_limit`**. The UI should show the limit and disable or error when over.

**Void:** Server applies locked-first logic; the UI cannot replicate exact post-state without API help, but it **can** show current `locked_balance` and `cashout_limit` and explain that void reduces locked first.

---

## 2. Current implementation (baseline)

| Area | Location | Behavior today |
|------|----------|----------------|
| Adjust UI | `components/chat/modals/edit-balance-drawer.tsx` | Pick **Credits vs Winnings**, reason dropdown (`free_play`, `manual` for main; `manual`, `seize_tip` for winning), add **or** deduct, optional notes. |
| API | `lib/api/users.ts` → `playersApi.manualPayment` | `POST api/admin/manual-payment` with `player_id`, `value`, `type: increase \| decrease`, `balanceType: main \| winning`, `reason`, `remarks?`. Response: `player_bal`, `player_winning_bal` only. |
| Caller | `components/chat/chat-component.tsx` | `handleUpdateBalance` validates reason, updates local `balance` / `winningBalance` from response. |
| Player model | `types/user.ts` | `balance`, `winning_balance`, optional `cashout_limit`, `locked_balance`. |
| Chat player object | Chat types / API | May not currently surface `cashout_limit` / `locked_balance` in the selected player; **verify** chat payload and extend types if missing. |

**Gap:** The new spec is framed as **adjustment kinds** (Freeplay, External Deposit, External Cashout, Void) with **fixed** add/deduct behavior and **method** labels in history — not as “pick main vs winning + generic reason.” The backend will likely expose a **new discriminator** (e.g. `adjustment_type` or structured `method`) and may **collapse or remap** how `balanceType` / `reason` work.

---

## 3. Target UX (recommended flow)

Replace or extend the drawer so the admin’s mental model matches the spec:

1. **Choose adjustment type** (four options; only show allowed actions per type — no “Add” for External Cashout/Void).
2. **Amount** (with validation rules per type).
3. **Context fields**
   - **Void:** required **reason** (enum or controlled list aligned with backend + “specific reason” in history).
   - **Others:** optional or required **notes** per policy; Freeplay / External Deposit may stay lightweight.
4. **Summary strip** showing:
   - Current **balance** (and which bucket(s) the API affects — **confirm with backend** if still split credits/winnings).
   - For **External Cashout** and **Void:** show **`cashout_limit`** and, for Void, **`locked_balance`**.
   - After submit (if API returns them): updated `cashout_limit` / `locked_balance` in success toast or inline refresh.

**Copy / compliance:** Short helper text under each type (e.g. External Deposit = “Money received outside the site”; External Cashout = “Paid outside the site; cannot exceed cashout limit”).

---

## 4. UI changes by adjustment type

### 4.1 Freeplay

- **Controls:** Add only; hide deduct.
- **Labels:** Method display **Freeplay** (not generic “Manual”).
- **Limits:** None beyond amount &gt; 0 (unless product adds caps).
- **Post-success:** Refresh balances; no `cashout_limit` change to show.

### 4.2 External Deposit

- **Controls:** Add only.
- **Labels:** Method **External Deposit**; analytics bucket is Purchase-side — history filters may show under purchase-style rows (depends on API `type` field — see §6).
- **Post-success:** Same as Freeplay for limits.

### 4.3 External Cashout

- **Controls:** Deduct only; hide add.
- **Validation:** `amount <= cashout_limit` (parse both as numbers with same currency semantics as rest of app).
- **Display:** Prominent **Cashout limit: $X**; optional warning when amount is close to limit.
- **Errors:** Map API errors for over-limit to a clear inline + toast message.
- **Post-success:** Show new balance **and** new `cashout_limit` if returned.

### 4.4 Void

- **Controls:** Deduct only.
- **Reason:** Required select + optional detail field if backend expects structured + free text.
- **Display:** Show **Locked balance** and **Cashout limit** with short explanation: “Void reduces locked balance first; cashout limit may decrease if locked is not enough.”
- **Post-success:** Prefer API returning updated `balance`, `locked_balance`, `cashout_limit` so the toast/sidebar stays accurate without guessing.

---

## 5. API integration checklist (coordinate with backend)

The frontend is blocked on a **stable contract**. Plan to update:

- **`playersApi.manualPayment`** (or a new endpoint e.g. `manual-adjustment`) to accept something like:
  - `adjustment_type: 'freeplay' | 'external_deposit' | 'external_cashout' | 'void'`
  - `amount` (or keep `value` for consistency)
  - `void_reason` / `reason_code` + optional `remarks` for Void
  - Deprecation path for legacy `balanceType` + `reason` if behavior changes
- **Response:** extend with `cashout_limit`, `locked_balance` (and any renamed balance fields) so chat and player detail UIs stay in sync.
- **Errors:** explicit codes or messages for cashout over limit, invalid void reason, etc.

**Open question for backend:** Does each adjustment still target **main vs winning** balances, or is there a single “player balance” in the new model? The UI must mirror that (one vs two toggles).

---

## 6. Transaction history & processing UI

Files that already special-case **manual** adjustments (extend when new methods appear):

- `components/dashboard/data-sections/transactions-section.tsx` — method filter map includes `'manual'`.
- `components/superadmin/superadmin-history-transactions.tsx` — same pattern.
- `lib/utils/formatters.ts` — `formatPaymentMethod` uppercases `manual`; add **freeplay**, **external_deposit**, **external_cashout**, **void** (or whatever snake_case the API returns).

**Planned work:**

- Add human-readable labels: Freeplay, External Deposit, External Cashout, Void.
- Badge colors: align Void / External Cashout as higher-attention (e.g. warning/danger) if design allows.
- If history rows expose **transaction type** `Add` / `Deduct** vs `purchase` / `cashout`:** confirm API shape. `types/transaction.ts` today uses `TransactionType = 'purchase' | 'cashout'`. If backend adds `add` / `deduct` or synthetic rows, extend types and row rendering (amount sign, labels).

---

## 7. Analytics screens

If the admin app has dashboards that group by “Freeplay”, “Purchase”, “Cashout”, “Void”:

- Ensure filter dimensions match backend (method + category).
- No frontend recalculation of analytics — only **display** API aggregates or labels consistently with §1.

(Scan for analytics components when the API is ready; none may exist beyond transaction lists.)

---

## 8. Realtime / chat sidebar

- **`balanceUpdated` / WebSocket** handlers in `hooks/use-chat-users.ts` and `chat-component.tsx` should update **`cashout_limit` and `locked_balance`** on the selected player if the payload includes them after adjustments.
- **`lastManualPaymentRef`** logic may need to include `adjustment_type` for clearer message matching.

---

## 9. Player detail pages (non-chat)

If managers/staff/superadmin can adjust balance outside chat:

- Reuse the same **adjustment drawer/modal** component (extract from chat if needed).
- Ensure `manager-player-detail.tsx`, `staff-player-detail.tsx`, `superadmin-player-detail.tsx`, and `app/dashboard/players/[id]/page.tsx` show **cashout limit** and **locked balance** wherever Void / External Cashout are allowed.

---

## 10. Testing (frontend)

- Unit tests for validation helpers: External Cashout over limit; Void without reason; disallowed add on deduct-only types.
- Component tests for drawer: correct buttons visible per type; summary shows correct fields.
- If `isReasonValidForAction` / `REASON_OPTIONS` are replaced, update or remove tests that reference them.

---

## 11. Suggested implementation order

1. Confirm API payload/response and whether balances remain split (main/winnings).
2. Add `cashout_limit` / `locked_balance` to chat player shape and sidebar display (read-only).
3. Refactor drawer: adjustment type first; wire to new API fields (feature-flag legacy path if needed).
4. Extend `manualPayment` types and success handling (all returned balances/limits).
5. History/formatters for new methods and any new transaction type values.
6. WebSocket + player detail parity.

---

## 12. Files likely to change (checklist)

| File | Change |
|------|--------|
| `components/chat/modals/edit-balance-drawer.tsx` | Restructure UX; validation; labels |
| `components/chat/chat-component.tsx` | New handler args; response mapping; WS-related refs |
| `lib/api/users.ts` | Request/response types for manual adjustment |
| `types/user.ts` / chat player types | Ensure limits on player object |
| `components/chat/sections/player-info-sidebar.tsx` | Display cashout limit / locked balance (optional but recommended) |
| `components/dashboard/data-sections/transactions-section.tsx` | Method labels/filters |
| `components/superadmin/superadmin-history-transactions.tsx` | Method labels/filters |
| `lib/utils/formatters.ts` | `formatPaymentMethod` extensions |
| `types/transaction.ts` | If new `type` or method enums appear |
| `hooks/use-chat-users.ts` | WS balance payload fields |

---

*Last updated: planning doc for frontend-only work; align with backend before implementation.*
