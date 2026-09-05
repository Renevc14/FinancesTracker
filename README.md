# Patrimonio — Portfolio Tracker

Tracker patrimonial personal (single-user) para consolidar cripto, acciones, estables y terrenos con multi-moneda nativo (USD / BOB / EUR).

## Stack (TypeScript end-to-end)

| Capa | Tecnología |
|------|------------|
| UI | Next.js 16 App Router + React 19 + Tailwind CSS 4 |
| Componentes | shadcn-style (Radix) + Recharts |
| Backend | Next.js Server Actions + Route Handlers |
| Validación | Zod |
| ORM / DB | Drizzle ORM + LibSQL (SQLite local → Turso en prod) |
| Auth | Auth.js (next-auth v5) credentials, single-user |
| Tooling | TypeScript, tsx, drizzle-kit |

## Quick start

```bash
cd portfolio-tracker
cp .env.example .env.local
npm install
npm run db:push
npm run db:seed
npm run dev
```

Abrí http://localhost:3000 — login con `AUTH_USERNAME` / `AUTH_PASSWORD` de `.env.local`.

## Scripts

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Dev server |
| `npm run build` | Build producción |
| `npm run db:push` | Aplica schema a SQLite/Turso |
| `npm run db:seed` | Seed Berchatti + assets base + FX |
| `npm run db:studio` | Drizzle Studio |

## Estructura

```
src/
  app/(app)/     # dashboard, transactions, land, snapshots, settings
  components/    # UI, forms, charts, layout
  lib/
    db/          # schema Drizzle tipado
    services/    # portfolio, land, snapshot (business logic)
    actions.ts   # Server Actions
    auth.ts      # Auth.js
    validators.ts
scripts/seed.ts
```

## Fase actual (P0 / Fase 0–1)

- Auth single-user
- CRUD transacciones financieras
- CRUD pagos de terrenos + cronograma Berchatti (seed)
- Dashboard multi-moneda (toggle USD/EUR/BOB)
- Snapshots mensuales manuales
- Catálogo de activos + FX viewer

## Push al remoto (desde tu PC)

```bash
cd portfolio-tracker
git init
git add .
git commit -m "Initial commit: portfolio tracker Phase 0/1"
git branch -M main
git remote add origin git@github.com:Renevc14/portfolio-tracker.git
git push -u origin main
```

## Deploy (Vercel + Turso)

1. Creá DB en Turso y copiá `DATABASE_URL` + `DATABASE_AUTH_TOKEN`
2. `npm run db:push` apuntando a Turso
3. `npm run db:seed`
4. Deploy en Vercel con las env vars de `.env.example`

## Roadmap siguiente

- Fase 2: FX API, import CSV Binance, precios auto, cron snapshots
- Fase 3: Compliance España 720/721, FIRE, IBKR
- Fase 4: Notificaciones, backup, PWA
