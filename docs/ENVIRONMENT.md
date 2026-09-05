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
| `AUTH_SECRET` | yes | random 32+ bytes | `openssl rand -base64 32` |
| `AUTH_USERNAME` | yes | `rene` | Single user |
| `AUTH_PASSWORD` | yes | strong password | Change from example defaults |
| `NEXT_PUBLIC_APP_NAME` | no | `Patrimonio` | Exposed to browser |

## Generating AUTH_SECRET

```bash
openssl rand -base64 32
```

## Vercel

Set the same variables in Project → Settings → Environment Variables for Production (and Preview if needed).

## Cloud Agent secrets

Prefer dashboard secrets over chat:

- `AUTH_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD` for runtime
- `GH_TOKEN` only if the agent must push (fine-grained: Contents R/W on this repo)

Revoke any token that appeared in a chat transcript.
