# Lucky Draw API Contract

Domain owner: **Django SlotAdmin API** (`NEXT_PUBLIC_API_URL`, typically `api.serverhub.biz`).
Frontends (`admindashboard`, `slotthingg`) are BFFs — they proxy or mock until upstream routes exist.

Mock mode: Next.js routes under `/api/admin/lucky-draw/*` and `/api/lucky-draw/*` serve an in-process fixture when the upstream returns 404/network error, or when `LUCKY_DRAW_USE_MOCK=1`.

## v1 product decisions (locked)

| Decision | v1 choice |
|---|---|
| Spin source for tickets | Eligible **game spins** only (provider spin events). Prize-wheel spins are out of scope unless a future earning rule type is added. |
| Purchase tickets | Awarded server-side when purchase completes and threshold rules match. |
| Prize credit | **Auto-credit** by default. Config flag `prize_credit_mode: auto \| approval` is stored; approval queue UI is deferred. |
| Who edits config | `company` (+ `superadmin` read/write for support). Managers: **view live + history + Run Draw**; no earning/prize config edits. |
| Multi-win default | `allow_multi_win: false` (one prize per player per draw). |
| Diamond ticket shop | Out of scope (removed from player copy). |

## Upstream paths (Django)

### Superadmin global gates
- `GET/PATCH /api/v1/lucky-draw/manual-thresholds/`

### Company config
- `GET/PATCH /api/v1/lucky-draw/config/`
- `GET/POST /api/v1/lucky-draw/earning-rules/`
- `PATCH/DELETE /api/v1/lucky-draw/earning-rules/{id}/`

### Cycles & draw
- `GET /api/v1/lucky-draw/cycles/active/`
- `POST /api/v1/lucky-draw/cycles/{id}/run-manual/`
- `GET /api/v1/lucky-draw/cycles/history/`
- `GET /api/v1/lucky-draw/cycles/{id}/`

### Player
- `GET /api/v1/lucky-draw/player/summary/`

## Scheduler (backend-only)
- At `scheduled_at`, run automatic draw → close cycle → open new 7d/30d cycle.
- Manual draw: enforce global thresholds → select winners → close → new cycle from **now** (next auto = now+7/30; prior schedule cancelled).

## Frontend proxy paths

| App | Path |
|---|---|
| admindashboard | `/api/admin/lucky-draw/config`, `earning-rules`, `cycles/active`, `cycles/history`, `cycles/[id]/run-manual`, `manual-thresholds` |
| slotthingg | `/api/lucky-draw/summary` |
