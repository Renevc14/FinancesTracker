# Security Policy

## Reporting

This is a private personal finance app. If you find a vulnerability in a deployment you operate, fix credentials and rotate secrets immediately. There is no public bug bounty.

## Hardening checklist

- [ ] Strong unique `AUTH_PASSWORD`
- [ ] Fresh `AUTH_SECRET` per environment
- [ ] No secrets in git history
- [ ] Production DB on Turso (not a laptop SQLite file exposed to the network)
- [ ] HTTPS only in production (Vercel default)
- [ ] Revoke GitHub PATs that were pasted into chats or logs
- [ ] Prefer fine-grained PATs scoped to this repository only

## Data handling

- Transaction CSVs may contain sensitive financial data — store outside the repo
- Soft-deleted rows may still exist in SQLite until vacuumed/purged
- Backups: copy the Turso DB or the local `data/portfolio.db` file securely

## Auth notes

- Single shared credential pair from environment variables
- Session cookies via Auth.js
- TOTP / hardware keys: planned (Fase 2), not implemented yet
