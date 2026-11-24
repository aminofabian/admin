# Lucky Draw API Contract

Domain owner: **Django SlotAdmin API** (`NEXT_PUBLIC_API_URL`).
Frontends (`admindashboard`, `slotthingg`) BFF-proxy these routes. Mock fixtures serve only when `LUCKY_DRAW_USE_MOCK=1`. Upstream 404s and network failures are returned as errors.

Aligned with **ProjectX Beta — Lucky Draw Frontend Handoff**.

## Concepts

| Concept | Meaning |
|---|---|
| Weekly draw | 7-day cycle, Silver tickets |
| Monthly draw | 30-day cycle, Gold tickets |
| Active cycle | Current open pool with `scheduled_draw_at` |
| Manual / early draw | Company Admin runs draw before schedule when Super Admin thresholds are met |
| Schedule reset | After manual or auto draw, new cycle starts from now (+7 / +30 days) |

Ticket earning (backend-wired):

1. Roulette `weekly_ticket` / `silver_ticket` → silver; `monthly_ticket` / `gold_ticket` → gold
2. Purchase threshold on company settings (`*_purchase_threshold` + `*_tickets_per_threshold`; `0` threshold = disabled)

## Upstream paths (Django)

Base: `/api/v1/` · Auth: JWT bearer

### Superadmin global gates
- `GET/PATCH /api/v1/admin/lucky-draw/global-settings/`

```json
{
  "early_draw_enabled": true,
  "weekly_min_tickets": 500,
  "weekly_min_players": 50,
  "monthly_min_tickets": 2000,
  "monthly_min_players": 150
}
```

### Company settings
- `GET/PATCH /api/v1/admin/lucky-draw/settings/`
  - Writable: company, manager (read/write per product), superadmin (`?company_id=` or body `company_id`)

### Live status + manual draw
- `GET /api/v1/admin/lucky-draw/status/`
- `POST /api/v1/admin/lucky-draw/run/` body `{ "draw_type": "weekly" | "monthly" }`
  - `409` + `code: "manual_thresholds_not_met"` when blocked

### History & prize credit
- `GET /api/v1/admin/lucky-draw/history/?draw_type=&limit=`
- `GET /api/v1/admin/lucky-draw/history/<cycle_id>/`
- `POST /api/v1/admin/lucky-draw/winners/<winner_id>/credit/` (when `prize_auto_credit` is false)

### Player
- `GET /api/v1/lucky-draw/`
- `GET /api/v1/lucky-draw/history/?draw_type=&limit=`

## Frontend proxy paths

| App | Path |
|---|---|
| admindashboard | `/api/admin/lucky-draw/global-settings`, `settings`, `status`, `run`, `history`, `history/[cycleId]`, `winners/[winnerId]/credit` |
| slotthingg | `/api/lucky-draw/summary` → upstream `/api/v1/lucky-draw/`; `/api/lucky-draw/history` → `/api/v1/lucky-draw/history/` |

## Screens & permissions

| Screen | Role | APIs |
|---|---|---|
| Global Lucky Draw Gates | Super Admin | global-settings |
| Company Lucky Draw Settings | Company / Manager | settings |
| Company Lucky Draw Dashboard | Company / Manager | status, run |
| Draw History | Company / Manager | history, credit |
| Player Lucky Draw | Player | lucky-draw, history |

Hide **Run Draw Now** when `global.early_draw_enabled` is false (still show scheduled countdown).

## Error codes

| code | UX |
|---|---|
| `forbidden` | Hide / route away |
| `company_required` | Prompt company picker |
| `manual_thresholds_not_met` | Disable button + show progress |
| `draw_disabled` | Show enable CTA |
| `no_eligible_tickets` | Toast / empty state |
| `prize_not_pending` | Refresh row |
| `invalid_prize_amounts` | Inline validation |

## Polling

Admin dashboard polls `status` every ~45s while open. No websocket required for v1. Automatic draws run on Celery every ~5 minutes.
