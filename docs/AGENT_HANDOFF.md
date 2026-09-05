# Agent handoff

Context for Cursor Cloud / Desktop agents picking up this repo.

## Repo facts

- **URL:** https://github.com/Renevc14/FinancesTracker
- **Default branch to use:** `main`
- **Local path (owner PC):** `F:\DOCUMENTOS IMPORTANTES\FinancesTracker`
- **Product name:** Patrimonio
- **Scope:** personal single-user app — do **not** turn into SaaS

## First 5 minutes

```bash
cp .env.example .env.local   # or Copy-Item on Windows
# set AUTH_SECRET, AUTH_USERNAME, AUTH_PASSWORD
npm install
npm run db:push
npm run db:seed
npm run build    # or npm run dev
```

Smoke:

- `GET /login` → 200
- unauthenticated `/dashboard` → 307 to login
- after login: dashboard, transactions, land, snapshots, settings, import

## What works today (Fase 0–1)

- Auth (server action login)
- Transactions CRUD
- Land lots M-176-15 / M-176-16 + payment flows + tabs
- Dashboard KPIs + allocation + currency toggle
- Manual monthly snapshots
- Settings: assets + FX
- Binance Spot parser + defensive import layer
- Apple HIG UI polish

## Do next (unless user says otherwise)

Priority backlog:

1. Complete Auto-Invest + IBKR Flex parsers (replace stubs)
2. Live FX / price feeds + scheduled snapshots
3. Harden auth (TOTP optional)
4. Vercel + Turso production deploy
5. Spain 720/721 / FIRE (later phases)

## Conventions

- Prefer Server Actions over ad-hoc API routes for mutations
- Validate with Zod before DB writes
- Keep TypeScript strict; run `npm run build` before claiming done
- UI: follow existing Apple HIG tokens in `globals.css` / `app-shell` — no purple-gradient AI defaults
- Do not commit `.env.local`, `/data`, or secrets
- Feature branches: `cursor/<name>-<id>` when in Cloud Agents

## Important files

| File | Why |
|------|-----|
| `README.md` | Product + ops overview |
| `src/lib/db/schema.ts` | Source of truth for data |
| `src/lib/actions.ts` | Mutations |
| `src/lib/imports/` | Broker import contracts |
| `scripts/seed.ts` | Baseline demo data |
| `AGENTS.md` | Next.js 16 agent caveats |

## Known quirks

- Next 16 may warn that `middleware` convention is deprecated in favor of `proxy`
- Client-side `signIn` was flaky in browser QA; use `login-action`
- Cloud Agents started **without** a linked repo do not get GitHub push tokens — start agents from this GitHub repo or supply `GH_TOKEN` as a secret
- Do not paste PATs into chat transcripts

## Suggested kickoff prompt

```text
You are continuing FinancesTracker (Patrimonio).
Read README.md, docs/AGENT_HANDOFF.md, and docs/ARCHITECTURE.md.
Ensure local app runs, then implement the highest-priority Fase 2 item
the user specifies (default: finish IBKR/Auto-Invest import parsers).
```
