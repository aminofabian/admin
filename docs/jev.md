# Jev decision helper

Cogniasys Admin uses [Jev](https://www.jevai.org) as a **judgment layer** only. It does not replace the main LLM, execute tools, or browse.

## Setup

1. Create a personal key at [https://www.jevai.org/agent/keys](https://www.jevai.org/agent/keys).
2. Add it to local env (`.env` / `.env.local` — both are gitignored):

```env
JEV_API_KEY=
```

3. Restart the Next.js server so the route handlers pick up the env var.

If `JEV_API_KEY` is unset, transaction actions run without a Jev gate (local/dev friendly).

## When Cogniasys calls Jev

**Live call site:** `POST /api/transaction-action` (`app/api/transaction-action/route.ts`)

Before proxying complete / cancel / send-to-provider actions to Django, the route calls Jev `toolGuard` (`lib/jev/`).

| Jev `decision` | Behavior |
| --- | --- |
| `allow` | Forward to backend |
| `confirm` / `review` | Return `jev_gate` unless the client resubmits with `jev_confirmed=1` after operator confirmation |
| `deny` | Block; do not forward |

Treat probabilities / confidence / guidance as **signals**, not authorization.

Reusable helpers: `toolGuard`, `routeTask`, `checkResearch`, `reviewCompletion`, plus optional `decide` / `routeModel` in `lib/jev/client.ts`.
