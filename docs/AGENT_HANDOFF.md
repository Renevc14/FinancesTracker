# Agent handoff

Context for Cursor Cloud / Desktop agents. **Chat history does not travel with the repo.** This file + `docs/NEW_MACHINE.md` are the continuation source of truth.

## Repo facts

| | |
|---|---|
| **GitHub** | https://github.com/Renevc14/FinancesTracker |
| **Push account** | [Renevc14](https://github.com/Renevc14) (`Renevc591` gets 403) |
| **Default branch** | `main` |
| **Product** | Folio |
| **UI language** | English |
| **Scope** | Personal **single-user** wealth tracker — **do not** turn into SaaS / multi-tenant |
| **Production** | https://finances-tracker-eight.vercel.app |
| **Owner local path (Windows)** | `F:\DOCUMENTOS IMPORTANTES\FinancesTracker` (may change on a new PC) |

Stack: Next.js 16 App Router · React 19 · Drizzle · LibSQL (SQLite local, **Turso in prod**) · Auth.js v5 · Vercel Hobby.

## First 5 minutes

On a **new machine**, also read [NEW_MACHINE.md](./NEW_MACHINE.md) (secrets are not in git).

Preferred:

```bash
cp .env.example .env.local
# set real AUTH_SECRET, AUTH_USERNAME, AUTH_PASSWORD (not the example placeholders)
npm install
npm run db:push
npm run db:seed    # demo only — skip if pointing at Turso
npm run dev
```

Docker: `docker compose up --build`.

Smoke:

- `GET /login` → 200
- unauthenticated `/dashboard` → 307 to `/login`
- after login: Home, Activity, Lots, Loans, Settings

Production login is **not** the `.env.example` password.

## Production ops

- **Deploy:** push `main`. GitHub Actions = lint + `next build`. Vercel GitHub integration deploys. Non-`main` branches are skipped (`vercel.json` `ignoreCommand`).
- **DB:** Turso `libsql://…`. Never `file:` on Vercel. Schema changes: `npm run db:push` **from a machine with Turso env**, not during the Vercel build.
- **Region:** `fra1` (Frankfurt). `iad1` (US) is **geo-blocked** by `api.binance.com` (HTTP 451 / “restricted location”). Do not change this back to a US region.
- **Cron:** `5 6 * * *` UTC → `GET /api/cron/daily` with `Authorization: Bearer $CRON_SECRET`. Runs markets, history fill, Binance sync, monthly snapshot. `maxDuration` 60s.
- **Env:** see [ENVIRONMENT.md](./ENVIRONMENT.md). `AUTH_SECRET` encrypts Binance keys (AES-256-GCM). Rotating it without re-saving the API key breaks sync.
- `vercel env pull` writes `[SENSITIVE]` placeholders for Turso; do not treat that file as a real `.env.local`.

## Domain rules (do not “simplify” these away)

### NAV / holdings

- **BTC/ETH/SOL (catalog crypto):** Spot `myTrades` is source of truth from **2026-02-01**. Non-`binance_api` buys/sells for an asset are soft-deleted only after at least one in-range API fill lands.
- **USDC/USDT (stables):** live **wallet snapshot** (Spot + Earn + Funding + collateral) after sync. They are included in Home NAV and Allocation. Ledger trades for stables are not required.
- **Lots:** cost line = paid; **value** = current Bs/m² when set (lot value − unpaid remainder). Remaining balance stays in committed.
- **Cash:** last bank snapshot.
- **Binance loan debt** subtracted from NAV; collateral counted in wallets.
- **Personal loans (lent):** off-balance — never in NAV, allocation, history, or savings ratio.
- `adjustment` transactions **do** change ledger quantity (needed if someone clicks Accept API).

### Binance sync (`/sync`, cron)

Client: `src/lib/exchanges/binance.ts`. Manager: `src/lib/exchanges/sync-manager.ts`.

1. Decrypt keys with `AUTH_SECRET`.
2. Signed requests use **Binance `/api/v3/time`** (not `Date.now()-3000`). Local Windows clocks can be ~4s fast; Binance rejects timestamps >1000ms ahead (`-1021`) regardless of `recvWindow`.
3. `testConnection` → balances → `myTrades` from `startTime` = portfolio start (not `fromId=1`) → Earn/Funding/loans/rewards.
4. Earn **rewards lookback is 90 days** (full history from Feb blew Vercel’s 60s budget). Positions are current.
5. Failed `myTrades` for every symbol fails the job (no longer swallowed as “0 trades”).
6. **Job status:**
   - `failed` + `0 fetch` + `binance · invalid` = connection/API error (geo-block, decrypt, bad key). Message is on the job and on the Sync button.
   - `partial` = sync **succeeded** but reconciliation found drift > 0.5% (typical leftover USDC vs empty book **before** stables-from-wallet; after that change, next sync should be `Done` if book matches wallets).
   - A stuck `Running` row is a timed-out invocation; it does not block the next sync (locks are in-memory).
7. **CSV import UI** (`/transactions/import`) lists sources as Ready but **has no upload**. Parsers exist in `src/lib/imports/`; they are not wired to a form. Live path is API Sync.

### Salary (`/settings/income`)

- Invoices live in `income_months` (Feb–Aug 2026 in seed/prod).
- `userConfig.monthlySalaryUsd` is the **default from a chosen month onward**.
- Saving requires **Applies from**. Months before that **without** a row are frozen at the previous rate (`source: salary`). Invoice rows are never overwritten.
- Prod (as of 2026-11): invoices Feb–Aug; **Sep $2,060** frozen; **Oct+ $2,300**.

### Land

- Lots M-176-15 / M-176-16. Payments: create / **edit / delete** (soft-delete). Lot is locked on edit. Future-dated payments rejected.
- Extra mistaken down payments on M-176-15: user deletes in UI (keep Reservation 15 Aug). There is no bulk-cleanup action.

### Loans page

- **Lent / borrowed (people):** manual `/loans/new`. Not synced.
- **Binance crypto loans:** same Sync as Spot (`/sapi/v2/loan/flexible/ongoing/orders`, optional stable). Upsert; missing ongoing orders marked repaid.

## What works today

- Auth (server action login) + optional TOTP (`AUTH_TOTP_SECRET`)
- Transactions CRUD; Activity Earn filter (off by default)
- Land: mark-to-market Bs/m², payment CRUD, receipts, discounts
- Dashboard KPIs, allocation, currency toggle, cost vs value chart, savings vs salary
- Bank cash in NAV; CoinGecko/Yahoo prices + live USD/EUR FX (BOB paralelo still manual)
- Monthly snapshots (Settings → Snapshots) + daily cron
- Settings: assets, FX, API credentials (encrypted), banks, JSON backup, salary-from-month
- Sync + reconciliation (Ignore / Accept API)
- FIRE editable, Modelo 720 print
- Binance Spot/Earn/Funding/loans/rewards; USDC/USDT in NAV from wallets
- Personal loans off-balance; Binance debt on `/loans`
- PWA, Docker Compose, Vercel+Turso production

## Do next (unless user says otherwise)

1. Binance deposit/withdrawal (on-chain transfer) history
2. Native push notifications (in-app lot-due notice exists)
3. Wire CSV upload UI if CSV fallback is needed (`/transactions/import` is a stub)
4. IBKR Flex / Auto-Invest parsers beyond current stubs
5. Copy `/data/receipts` if lot payment files are missing after a Turso-only restore

## Conventions

- Server Actions + Zod; TypeScript strict; `npm run build` before claiming done
- UI: existing Apple HIG tokens in `globals.css` / `app-shell` — no purple-gradient defaults
- Do **not** commit `.env.local`, `/data`, secrets
- Feature branches: `cursor/<name>-<id>` in Cloud Agents; owner often pushes `main` directly
- Prefer English UI copy

## Important files

| File | Why |
|------|-----|
| `README.md` | Product + local run |
| `docs/NEW_MACHINE.md` | New PC / secrets (no chat history) |
| `docs/ARCHITECTURE.md` | Layers and data model |
| `docs/DEPLOYMENT.md` | Vercel + Turso |
| `docs/ENVIRONMENT.md` | Env vars |
| `src/lib/db/schema.ts` | Schema |
| `src/lib/actions.ts` | Mutations |
| `src/lib/exchanges/binance.ts` | Binance client |
| `src/lib/exchanges/sync-manager.ts` | Sync + recon + Accept API |
| `src/lib/services/portfolio.ts` | NAV / holdings (stables from wallets) |
| `src/lib/services/savings.ts` | Salary by month |
| `vercel.json` | `fra1` + cron |
| `AGENTS.md` | Next.js 16 agent caveats |

## Known quirks

- Next 16 may warn `middleware` is deprecated in favor of `proxy`
- Use `login-action`, not flaky client `signIn`
- Example `.env` `AUTH_SECRET=generate-with-openssl-rand-base64-32` **cannot** decrypt production keys
- Cloud Agents without a linked GitHub repo have no push token
- Do not paste PATs into chat
- Home must not backfill CoinGecko/Yahoo on every load (Vercel timeouts)

## Suggested kickoff prompt

```text
You are continuing FinancesTracker (Folio).
Read README.md, docs/AGENT_HANDOFF.md, docs/NEW_MACHINE.md, and docs/ARCHITECTURE.md.
Single-user personal finance — no SaaS. Production is Vercel fra1 + Turso.
Do not commit .env.local or /data. Then do what the owner asked.
```
