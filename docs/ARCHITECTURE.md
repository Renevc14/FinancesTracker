# Architecture

## Purpose

Single-user wealth tracker. One authenticated owner. No multi-tenancy, billing, or public signup.

## Runtime layers

```
┌─────────────────────────────────────────────┐
│  UI (App Router pages + client components)  │
│  Apple HIG-inspired shell, Recharts         │
├─────────────────────────────────────────────┤
│  Server Actions + Auth.js session           │
│  Zod validators                             │
├─────────────────────────────────────────────┤
│  Domain services                            │
│  portfolio · land · snapshot · fx · savings │
│  exchanges/binance + sync-manager           │
├─────────────────────────────────────────────┤
│  Drizzle ORM                                │
│  LibSQL client → SQLite file or Turso       │
└─────────────────────────────────────────────┘
```

## Key modules

| Path | Responsibility |
|------|----------------|
| `src/app/(app)/` | Authenticated pages |
| `src/app/login/` | Login UI |
| `src/middleware.ts` | Session gate (Next may migrate to `proxy`) |
| `src/lib/auth.ts` | Auth.js config (credentials provider) |
| `src/lib/login-action.ts` | Server-side sign-in (preferred over client `signIn`) |
| `src/lib/actions.ts` | Mutations: transactions, land payments, snapshots, settings |
| `src/lib/validators.ts` | Zod schemas |
| `src/lib/db/schema.ts` | Tables and relations |
| `src/lib/services/*` | Read models: dashboard, land, personal loans, savings |
| `src/lib/exchanges/binance.ts` | Signed Binance client (server time, 451, myTrades, Earn) |
| `src/lib/exchanges/sync-manager.ts` | Sync jobs, wallets, recon, Accept API |
| `src/lib/imports/*` | Broker CSV contracts, parsers, dedupe (UI upload not wired) |
| `src/components/layout/app-shell.tsx` | Tab bar + large titles |
| `vercel.json` | Region `fra1`, daily cron, main-only deploys |

## Data model (conceptual)

- **Assets** — catalog (crypto, stock, stable, etc.)
- **Transactions** — buys/sells/transfers with optional import provenance
- **Land contracts + payments** — installment lots (Berchatti); current Bs/m² stored on the contract and as a price snapshot (USD/m²)
- **FX rates** — currency conversion history
- **Price snapshots** — asset prices at a point in time
- **Monthly snapshots** — frozen portfolio valuation (UI under Ajustes → Fotos)
- **Personal loans** — money lent to others; off-balance (never in NAV, allocation, history, or savings ratio)
- **User config** — preferences including current `monthlySalaryUsd`
- **Income months** — invoice or frozen salary rows; default salary applies from a chosen month
- **Exchange credentials** — AES-256-GCM with `AUTH_SECRET`
- **Sync jobs / wallet snapshots / recon items** — last Binance run

Soft-delete is used where applicable. Import rows dedupe on `(importedFrom, importRef)`.

## Auth flow

1. Credentials compared to `AUTH_USERNAME` / `AUTH_PASSWORD` (env).
2. Session cookie via Auth.js.
3. Middleware / layout protect `(app)` routes.
4. Unauthenticated access → redirect `/login?callbackUrl=…`.

## Currency

Portfolio values can be displayed in USD, EUR, or BOB using stored FX. Toggle is client UI; conversions happen in services.

## Import / sync pipeline

1. **Binance Spot (source of truth for catalog crypto):** `/sync` (and daily cron) paginates `/api/v3/myTrades` for `{TICKER}USDT` and `{TICKER}USDC` from **2026-02-01**. Signed timestamps come from `/api/v3/time`. Older fills are ignored. Non-`binance_api` buys/sells are soft-deleted only after an in-range API fill lands for that asset.
2. **Binance Earn / loans / stables:** same job pulls Simple Earn positions + last **90 days** of rewards, Funding, ongoing crypto loans, and wallet totals. Earn credits become `reward` rows. **USDC/USDT NAV uses the wallet snapshot**, not the trade ledger. Reconciliation: Spot + Earn + Funding + collateral; NAV subtracts loan debt.
3. **Accept API** writes `adjustment` transactions so the book matches the API; those rows count toward quantity.
4. CSV parsers in `src/lib/imports/` are fallback; **`/transactions/import` has no upload UI yet.**

Vercel functions **must** run in `fra1`. US regions get HTTP 451 from Binance.

## Salary

`applySalaryFromMonth` (`src/lib/services/savings.ts`): freeze months before `fromMonth` that lack `income_months` at the previous default; delete salary-source rows from `fromMonth` onward; update `userConfig.monthlySalaryUsd`. Invoice rows stay.

## Non-goals

- Multi-user / orgs / SaaS
- Full Auto-Invest / IBKR Flex parsers (stubs only)
- Spanish tax filings automation beyond printable 720
- Native push notifications
