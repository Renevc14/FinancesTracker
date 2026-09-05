# Patrimonio — Portfolio Tracker

Tracker patrimonial personal (single-user) para consolidar cripto, acciones, estables y terrenos con multi-moneda nativo (USD / BOB / EUR).

## Stack (TypeScript end-to-end)

| Capa | Tecnología |
|------|------------|
| UI | Next.js App Router + React 19 + Tailwind CSS 4 |
| Componentes | shadcn-style (Radix) + Recharts |
| Backend | Next.js Server Actions + Route Handlers |
| Validación | Zod |
| ORM / DB | Drizzle ORM + LibSQL (SQLite local → Turso en prod) |
| Auth | Auth.js (next-auth v5) credentials, single-user |
| Deploy | Vercel |

## Quick start

```bash
cd portfolio-tracker
cp .env.example .env.local
npm install
npm run db:push
npm run db:seed
npm run dev
```

Abrí http://localhost:3000 — login con `AUTH_USERNAME` / `AUTH_PASSWORD` de `.env.local`
(defaults de ejemplo: `rene` / `patrimonio2026`).

## Scripts

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Dev server |
| `npm run build` | Build producción |
| `npm run db:push` | Aplica schema a SQLite/Turso |
| `npm run db:seed` | Seed Berchatti + assets base + FX |
| `npm run db:studio` | Drizzle Studio |
| `npx tsx scripts/import-sheet-csv.ts <csv>` | Stub import CSV (parsers en Fase 2) |

## Estructura

```
src/
  app/(app)/     # dashboard, transactions, land, snapshots, settings
  components/    # UI, forms, charts, layout, land tabs
  lib/
    db/          # schema Drizzle tipado
    services/    # portfolio, land, snapshot, fx
    actions.ts   # Server Actions
    auth.ts      # Auth.js
    validators.ts
scripts/seed.ts
scripts/import-sheet-csv.ts
vercel.json
```

## Fase actual (P0 / Fase 0–1)

- Auth single-user (credentials)
- CRUD transacciones financieras
- CRUD pagos de terrenos + tabs Contrato/Pagos/Cronograma/Estado
- Seed Berchatti (M-176-15 / M-176-16)
- Dashboard multi-moneda (toggle USD/EUR/BOB)
- Snapshots mensuales manuales
- Catálogo de activos + FX viewer

## Push al remoto (desde tu PC)

```bash
cd portfolio-tracker
# ya hay commit en branch cursor/portfolio-tracker-phase0-2937
git remote add origin git@github.com:Renevc14/portfolio-tracker.git
git push -u origin cursor/portfolio-tracker-phase0-2937
# o a main:
git checkout -B main
git push -u origin main
```

## Deploy checklist (Vercel + Turso)

1. Crear DB en [Turso](https://turso.tech) y copiar `DATABASE_URL` + `DATABASE_AUTH_TOKEN`
2. `DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:push`
3. `DATABASE_URL=… DATABASE_AUTH_TOKEN=… npm run db:seed`
4. Importar proyecto en Vercel (framework detectado vía `vercel.json`)
5. Env vars en Vercel: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `NEXT_PUBLIC_APP_NAME`
6. Deploy

## Roadmap siguiente

- Fase 2: FX API, import CSV Binance/IBKR, precios auto, cron snapshots, TOTP
- Fase 3: Compliance España 720/721, FIRE
- Fase 4: Notificaciones, backup, PWA
