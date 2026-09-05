# Deployment

## Local production mode

```bash
npm run db:push
npm run db:seed   # once
npm run build
npm run start     # http://localhost:3000
```

## Turso (managed SQLite)

1. Create a database in the Turso dashboard
2. Copy URL + auth token into `.env.local` / Vercel env
3. Apply schema and seed:

```bash
DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:push
DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:seed
```

## Vercel

1. Import https://github.com/Renevc14/FinancesTracker
2. Framework: Next.js (see `vercel.json`, region `iad1`)
3. Configure env vars (see [ENVIRONMENT.md](./ENVIRONMENT.md))
4. Deploy
5. Open the deployment URL → `/login`

### Post-deploy checklist

- [ ] Login works with production credentials
- [ ] Dashboard loads after seed (or after first data entry)
- [ ] Land lots visible if seeded
- [ ] `DATABASE_URL` points at Turso, not a local file path
- [ ] `AUTH_PASSWORD` is not the development example

## Domains

Optional: attach a custom domain in Vercel. No special app config required beyond Auth.js `AUTH_URL` / trust host if you harden auth later.
