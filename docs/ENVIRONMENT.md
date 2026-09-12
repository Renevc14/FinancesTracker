# Environment variables

## Setup

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. Never commit it.

## Reference

| Name | Required | Example | Notes |
|------|----------|---------|-------|
| `DATABASE_URL` | yes | `file:./data/portfolio.db` | Local SQLite via LibSQL |
| `DATABASE_URL` | prod | `libsql://xxx.turso.io` | Turso |
| `DATABASE_AUTH_TOKEN` | Turso only | `eyJ…` | Required for remote LibSQL |
| `TURSO_DATABASE_URL` | prod alias | `libsql://xxx.turso.io` | Used if `DATABASE_URL` is unset (Vercel/Turso integration) |
| `TURSO_AUTH_TOKEN` | prod alias | `eyJ…` | Used if `DATABASE_AUTH_TOKEN` is unset |
| `AUTH_SECRET` | yes | random 32+ bytes | `openssl rand -base64 32` |
| `AUTH_USERNAME` | yes | `rene` | Single user |
| `AUTH_PASSWORD` | yes | strong password | Change from example defaults |
| `AUTH_TRUST_HOST` | prod | `true` | Required on Vercel |
| `AUTH_URL` | prod | `https://….vercel.app` | Canonical origin |
| `CRON_SECRET` | prod | random 32+ bytes | Vercel Cron sends `Authorization: Bearer …` |
| `NEXT_PUBLIC_APP_NAME` | no | `Folio` | Exposed to browser |

## Generating AUTH_SECRET

```bash
openssl rand -base64 32
```

## Vercel

Set Production (not Preview) in Project → Settings → Environment Variables. Preview deploys from non-`main` branches are skipped in `vercel.json`.

## Cloud Agent secrets

Prefer dashboard secrets over chat:

- `AUTH_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD` for runtime
- `GH_TOKEN` only if the agent must push (fine-grained: Contents R/W on this repo)

Revoke any token that appeared in a chat transcript.
