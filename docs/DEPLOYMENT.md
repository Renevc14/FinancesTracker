# Deployment

Production is **Vercel** (Next.js) + **Turso** (LibSQL).

| | |
|---|---|
| **URL** | https://finances-tracker-eight.vercel.app |
| **GitHub** | https://github.com/Renevc14/FinancesTracker (`Renevc14` can push) |
| **Region** | `fra1` (Frankfurt) — required so Binance is not geo-blocked |
| **Cron** | `5 6 * * *` UTC → `/api/cron/daily` |

GitHub Actions runs lint/typecheck/build on PRs and `main`. Pushing `main` deploys to Vercel. Other branches are ignored.

## GitHub Actions

Workflow: `.github/workflows/ci.yml`.

It does **not** deploy. Vercel’s GitHub integration deploys `main`. CI here is lint + production build.

## Turso

Do not point Vercel at `file:./data/portfolio.db`. Serverless has no persistent local SQLite.

### Create the database from the local file (recommended)

Keeps land, banks, loans, snapshots, and encrypted Binance credentials.

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create folio --from-file ./data/portfolio.db
turso db show folio --url
turso db tokens create folio
```

Put the URL in `DATABASE_URL` (or `TURSO_DATABASE_URL`) and the token in `DATABASE_AUTH_TOKEN` (or `TURSO_AUTH_TOKEN`). Never commit them.

If the Turso database already exists and is empty:

```bash
DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:push
TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run db:copy-to-turso
```

`npm run db:seed` is only for a blank demo. Prefer `--from-file` or `db:copy-to-turso` for real data.

Land payment receipt **files** live under `/data/receipts` and do not upload with this copy. Payment rows still exist; re-attach files later if needed.

## Vercel

1. Import https://github.com/Renevc14/FinancesTracker (framework Next.js, region `fra1` — see `vercel.json`). Do **not** switch the project to `iad1`.
2. Set Production env vars (see [ENVIRONMENT.md](./ENVIRONMENT.md)).
3. Production `AUTH_URL` = `https://finances-tracker-eight.vercel.app` (or a custom domain).
4. Set `CRON_SECRET` so `/api/cron/daily` only runs from Vercel Cron (06:05 UTC).
5. Deploy from `main`. The production build is `next build`. Schema changes to Turso are applied from your machine (`npm run db:push` with Turso env), not during the Vercel build.
6. `AUTH_SECRET` must stay stable: it encrypts stored Binance keys. Changing it requires re-saving the API key in Settings.

### Post-deploy checklist

- [x] Login works with production credentials (`AUTH_PASSWORD` is not the example default)
- [x] Dashboard loads with Turso data
- [x] Settings → Sync reaches Binance from `fra1` (`binance · ok`)
- [x] `DATABASE_URL` is `libsql://…`, not a local file
- [x] Cron listed in the Vercel project (Hobby: one daily job)

If a new machine cannot decrypt Binance keys locally, `AUTH_SECRET` in `.env.local` does not match production (or `vercel env pull` left placeholders).

New PC: [NEW_MACHINE.md](./NEW_MACHINE.md).

## Domains

Optional: attach a custom domain in Vercel. Update `AUTH_URL` to match.
