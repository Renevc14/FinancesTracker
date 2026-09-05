# Patrimonio — FinancesTracker

Tracker patrimonial **personal (single-user, no SaaS)** para Rene (`Renevc14`). Consolida cripto, acciones, estables y terrenos (Berchatti) con multi-moneda nativo (**USD / BOB / EUR**).

**Repo:** https://github.com/Renevc14/FinancesTracker  
**App name:** Patrimonio (`NEXT_PUBLIC_APP_NAME`)

---

## Para el siguiente agente (handoff)

### Estado

- Fase **0–1 MVP** implementada y usable en local.
- UI mobile-first estilo **Apple HIG**.
- Capa defensiva de **imports** Binance Spot (parser + smoke) + stubs Auto-Invest / IBKR.
- Base de datos: SQLite local (`file:./data/portfolio.db`) vía LibSQL/Drizzle. Lista para Turso.
- Auth: Auth.js v5 credentials (usuario único vía env). Login vía **server action** (`src/lib/login-action.ts`).

### Qué NO está hecho (backlog)

- Parsers completos Auto-Invest Binance e IBKR Flex
- FX / precios en vivo (APIs) + cron de snapshots
- TOTP, compliance España 720/721, FIRE, PWA, export PDF
- Deploy producción en Vercel (config `vercel.json` lista; falta Turso + env en Vercel)

### Cómo arrancar (PC Windows)

```powershell
cd "F:\DOCUMENTOS IMPORTANTES\FinancesTracker"
git clone https://github.com/Renevc14/FinancesTracker.git .
# si la carpeta ya existe con git:
# git pull origin main

copy .env.example .env.local
# Editar .env.local: AUTH_SECRET, AUTH_USERNAME, AUTH_PASSWORD

npm install
npm run db:push
npm run db:seed
npm run build
npm run start
# o desarrollo: npm run dev
```

Abrir http://localhost:3000  
Login: valores de `.env.local` (ejemplo histórico de desarrollo: `rene` / `patrimonio2026` — **cámbialos**).

### Archivos sensibles (nunca commit)

- `.env.local` — ignorado
- `/data/*.db` — ignorado

### Comandos útiles

| Script | Uso |
|--------|-----|
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Producción local |
| `npm run db:push` | Aplica schema Drizzle |
| `npm run db:seed` | Seed activos + FX + lotes Berchatti |
| `npm run db:studio` | Drizzle Studio |
| `npx tsx scripts/smoke-binance-parser.ts` | Smoke parser Spot |
| `npx tsx scripts/import-sheet-csv.ts <csv>` | Stub CSV |

---

## Stack

| Capa | Tecnología |
|------|------------|
| UI | Next.js 16 App Router + React 19 + Tailwind CSS 4 |
| Componentes | Radix / shadcn-style + Recharts |
| Backend | Server Actions + Auth.js (next-auth v5) |
| Validación | Zod |
| ORM / DB | Drizzle ORM + `@libsql/client` (SQLite → Turso) |
| Deploy | Vercel (`vercel.json`) |

---

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` | Login credentials |
| `/dashboard` | KPIs, allocation, toggle moneda |
| `/transactions` | Lista + alta |
| `/transactions/import` | Import Binance/IBKR (capa defensiva) |
| `/land` | Lotes Berchatti |
| `/land/[id]` | Tabs Estado / Contrato / Pagos / Cronograma |
| `/snapshots` | Snapshots mensuales manuales |
| `/settings` | Activos + FX |

---

## Estructura

```
src/
  app/(app)/          # páginas autenticadas
  app/login/          # login
  components/         # UI, layout (app-shell), charts, land tabs
  lib/
    db/               # schema Drizzle
    services/         # portfolio, land, snapshot, fx
    imports/          # contratos tipados + parsers Binance/IBKR
    actions.ts        # Server Actions (CRUD + snapshots)
    auth.ts           # Auth.js
    login-action.ts   # sign-in server-side
    validators.ts
scripts/
  seed.ts
  smoke-binance-parser.ts
  import-sheet-csv.ts
```

### Seed incluido

- Activos: BTC, ETH, SOL, USDC, VUAA (+ FX USD/BOB/EUR)
- Terrenos Berchatti: **M-176-15**, **M-176-16**

### Schema (ideas clave)

- Soft-delete en entidades relevantes
- Dedupe de imports: unique `(importedFrom, importRef)`
- Snapshots mensuales + FX history + price snapshots

---

## Variables de entorno

Ver `.env.example`:

```
DATABASE_URL=file:./data/portfolio.db
AUTH_SECRET=...
AUTH_USERNAME=rene
AUTH_PASSWORD=...
NEXT_PUBLIC_APP_NAME=Patrimonio
```

Para Turso: `DATABASE_URL=libsql://…` + `DATABASE_AUTH_TOKEN`.

---

## Deploy Vercel + Turso

1. Crear DB en Turso; copiar URL + token
2. `npm run db:push` / `npm run db:seed` contra Turso
3. Importar este repo en Vercel
4. Env: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `NEXT_PUBLIC_APP_NAME`
5. Deploy

---

## Roadmap

- **Fase 2:** FX/precios API, parsers Auto-Invest + IBKR, cron snapshots, TOTP
- **Fase 3:** Compliance España 720/721, FIRE
- **Fase 4:** Notificaciones, backup, PWA

---

## Nota Next.js

Leer `AGENTS.md` y docs en `node_modules/next/dist/docs/` — Next 16 tiene convenciones distintas (p. ej. middleware → proxy).
