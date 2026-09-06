# Agent handoff

Context for Cursor Cloud / Desktop agents picking up this repo.

## Repo facts

- **URL:** https://github.com/Renevc14/FinancesTracker
- **Default branch to use:** `main`
- **Local path (owner PC):** `F:\DOCUMENTOS IMPORTANTES\FinancesTracker`
- **Product name:** Patrimonio
- **Scope:** personal single-user app — do **not** turn into SaaS

## First 5 minutes

Preferred on the owner PC (Docker Desktop):

```bash
cp .env.example .env.local   # or Copy-Item on Windows
# set AUTH_SECRET, AUTH_USERNAME, AUTH_PASSWORD
docker compose up --build
```

Without Docker:

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

## What works today

- Auth (server action login) + TOTP opcional (`AUTH_TOTP_SECRET`)
- Transactions CRUD
- Land lots M-176-15 / M-176-16 + payment flows (receipt file + optional discount)
- Dashboard KPIs + allocation + currency toggle
- **Patrimonio incluye lotes al costo** (pagado); saldo pendiente en comprometido
- Cash bancario (último saldo) en patrimonio
- Precios CoinGecko/Yahoo y FX USD/EUR en vivo
- Manual monthly snapshots + cron diario
- Settings: assets, FX, API credentials, banks, backup JSON
- Sync / reconciliation (aceptar API) / FIRE editable / Modelo 720
- Binance Spot API (`myTrades` USDT/USDC) es la fuente de verdad de compras/ventas de criptos del catálogo (BTC/ETH/SOL) **desde 2026-02-01**; CSV es fallback
- Binance Earn (flexible/locked), Funding y préstamos (colateral + deuda neta en el patrimonio)
- Auto-Invest CSV, IBKR Flex CSV/XML, Kraken client
- PWA manifest
- Docker Compose local run

## Do next (unless user says otherwise)

Priority backlog:

1. Vercel + Turso production deploy
2. Historial Binance depósitos-retiros (transferencias on-chain) completo
3. Push notifications nativas (hoy hay aviso in-app de cuota)

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
