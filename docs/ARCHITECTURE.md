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
│  portfolio · land · snapshot · fx           │
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
| `src/lib/services/*` | Read models / aggregations for dashboard & land |
| `src/lib/imports/*` | Broker CSV contracts, parsers, dedupe |
| `src/components/layout/app-shell.tsx` | Tab bar + large titles |

## Data model (conceptual)

- **Assets** — catalog (crypto, stock, stable, etc.)
- **Transactions** — buys/sells/transfers with optional import provenance
- **Land contracts + payments** — installment lots (Berchatti)
- **FX rates** — currency conversion history
- **Price snapshots** — asset prices at a point in time
- **Monthly snapshots** — frozen portfolio valuation
- **User config** — preferences

Soft-delete is used where applicable. Import rows dedupe on `(importedFrom, importRef)`.

## Auth flow

1. Credentials compared to `AUTH_USERNAME` / `AUTH_PASSWORD` (env).
2. Session cookie via Auth.js.
3. Middleware / layout protect `(app)` routes.
4. Unauthenticated access → redirect `/login?callbackUrl=…`.

## Currency

Portfolio values can be displayed in USD, EUR, or BOB using stored FX. Toggle is client UI; conversions happen in services.

## Import pipeline

1. **Binance Spot (source of truth for catalog crypto):** `/sync` paginates `/api/v3/myTrades` for `{TICKER}USDT` and `{TICKER}USDC` from **2026-02-01** (portfolio start). Older fills are ignored. Buys/sells that are not `binance_api` are soft-deleted only if at least one in-range API fill landed for that asset.
2. **Binance Earn / loans:** same sync pulls Simple Earn positions + reward history, Funding wallet, and ongoing crypto loans. Reconciliation uses Spot + Earn + Funding + collateral. NAV subtracts outstanding loan debt.
3. Upload / paste CSV on `/transactions/import` (fallback, plus Auto-Invest / IBKR)
4. Parser selected by source (`binance/spot`, Auto-Invest, IBKR)
5. Validate rows → typed `ImportRow` contracts
6. Dedupe against DB → insert transactions

## Non-goals (current phase)

- Multi-user / orgs
- Live market data (planned Fase 2)
- Full Auto-Invest / IBKR Flex parsers (stubs only)
- Spanish tax filings automation (Fase 3)
