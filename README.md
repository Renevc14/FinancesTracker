# Patrimonio (FinancesTracker)

Tracker patrimonial **personal** (un solo usuario, no multi-tenant / no SaaS) para consolidar cripto, acciones, estables y terrenos (Berchatti) con multi-moneda nativo: **USD**, **BOB** y **EUR**.

| | |
|---|---|
| **Repositorio** | https://github.com/Renevc14/FinancesTracker |
| **Owner** | [Renevc14](https://github.com/Renevc14) |
| **Stack** | Next.js 16 · React 19 · Drizzle · LibSQL/SQLite · Auth.js |
| **Estado** | Fase 0–1 MVP usable en local |
| **Licencia** | Privado / uso personal |

---

## Tabla de contenidos

1. [Características](#características)
2. [Requisitos](#requisitos)
3. [Inicio rápido](#inicio-rápido)
4. [Variables de entorno](#variables-de-entorno)
5. [Scripts npm](#scripts-npm)
6. [Rutas de la aplicación](#rutas-de-la-aplicación)
7. [Arquitectura](#arquitectura)
8. [Base de datos y seed](#base-de-datos-y-seed)
9. [Imports (Binance / IBKR)](#imports-binance--ibkr)
10. [Despliegue](#despliegue)
11. [Roadmap](#roadmap)
12. [Documentación adicional](#documentación-adicional)
13. [Seguridad](#seguridad)
14. [Contribuir / handoff de agentes](#contribuir--handoff-de-agentes)

---

## Características

- Auth single-user (credentials Auth.js v5) vía variables de entorno
- Dashboard con KPIs, allocation chart y toggle de moneda (USD / EUR / BOB)
- CRUD de transacciones financieras
- Terrenos Berchatti: contratos, pagos, cronograma e estado (tabs)
- Snapshots patrimoniales mensuales (manuales)
- Catálogo de activos + tipos de cambio (FX)
- UI mobile-first estilo Apple HIG
- Capa de import tipada (Binance Spot operativo; Auto-Invest e IBKR como stubs)

---

## Requisitos

- **Node.js** 20+ (recomendado 22 LTS)
- **npm** 10+
- Git

Opcional para producción: cuenta [Turso](https://turso.tech) + [Vercel](https://vercel.com).

**Docker (recomendado en este PC):** Docker Desktop 24+.

---

## Inicio rápido

### Docker (Windows / macOS / Linux)

```bash
cp .env.example .env.local   # o Copy-Item en PowerShell
# Editar .env.local (AUTH_SECRET, AUTH_USERNAME, AUTH_PASSWORD)

docker compose up --build
```

El contenedor aplica `db:push`, hace seed la primera vez y sirve **http://localhost:3000**.

```bash
docker compose down
```

### Windows sin Docker (ruta habitual del owner)

```powershell
cd "F:\DOCUMENTOS IMPORTANTES\FinancesTracker"
git clone https://github.com/Renevc14/FinancesTracker.git .
# Si la carpeta ya tiene git:
# git checkout main
# git pull origin main

Copy-Item .env.example .env.local
# Editar .env.local (AUTH_SECRET, usuario y contraseña)

npm install
npm run db:push
npm run db:seed
npm run dev
```

### macOS / Linux

```bash
git clone https://github.com/Renevc14/FinancesTracker.git
cd FinancesTracker
cp .env.example .env.local
# Editar .env.local

npm install
npm run db:push
npm run db:seed
npm run dev
```

Abrir **http://localhost:3000** → `/login`.

Producción local:

```bash
npm run build && npm run start
```

---

## Variables de entorno

Copia `.env.example` → `.env.local`. **Nunca** subas `.env.local` ni bases SQLite.

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | `file:./data/portfolio.db` (local) o URL `libsql://…` (Turso) |
| `DATABASE_AUTH_TOKEN` | Turso | Token de autenticación Turso |
| `AUTH_SECRET` | Sí | Secreto Auth.js (`openssl rand -base64 32`) |
| `AUTH_USERNAME` | Sí | Usuario único de login |
| `AUTH_PASSWORD` | Sí | Contraseña (mín. razonable; cámbiala en prod) |
| `NEXT_PUBLIC_APP_NAME` | No | Nombre visible (default `Patrimonio`) |

Detalle y checklist: [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

---

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build (`next start`) |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica schema Drizzle a la DB |
| `npm run db:generate` | Genera migraciones Drizzle |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Seed (activos, FX, lotes Berchatti) |

Utilidades:

```bash
npx tsx scripts/smoke-binance-parser.ts
npx tsx scripts/import-sheet-csv.ts <archivo.csv>
```

---

## Rutas de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/login` | Login |
| `/dashboard` | Resumen patrimonial |
| `/transactions` | Lista de movimientos |
| `/transactions/new` | Alta de transacción |
| `/transactions/import` | Import CSV (capa defensiva) |
| `/land` | Listado de lotes |
| `/land/[id]` | Detalle (Estado / Contrato / Pagos / Cronograma) |
| `/land/[id]/payments/new` | Nuevo pago de terreno |
| `/snapshots` | Snapshots mensuales |
| `/snapshots/[date]` | Detalle de snapshot |
| `/settings` | Ajustes |
| `/settings/assets` | Catálogo de activos |
| `/settings/fx` | Tipos de cambio |

Las rutas bajo `(app)` requieren sesión; sin auth redirigen a `/login`.

---

## Arquitectura

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Resumen:

```
Browser → Next.js App Router
            ├─ Server Actions (CRUD, snapshots, login)
            ├─ Auth.js (credentials / session cookies)
            └─ Drizzle ORM → LibSQL (SQLite file | Turso)
```

UI: Tailwind 4 + componentes Radix estilo shadcn + Recharts.  
Validación: Zod.  
Imports: contratos tipados en `src/lib/imports/`.

---

## Base de datos y seed

- Schema: `src/lib/db/schema.ts`
- Cliente: `src/lib/db/index.ts`
- Soft-delete en entidades relevantes
- Dedupe de imports: unique `(importedFrom, importRef)`

**Seed** (`npm run db:seed`):

- Activos: BTC, ETH, SOL, USDC, VUAA
- FX base USD / BOB / EUR
- Lotes Berchatti: **M-176-15**, **M-176-16**

La carpeta `/data` y `*.db` están en `.gitignore`.

---

## Imports (Binance / IBKR)

| Origen | Estado |
|--------|--------|
| Binance Spot | API `myTrades` (fuente de verdad BTC/ETH/SOL USDT+USDC) + parser CSV fallback |
| Binance Auto-Invest | Stub tipado |
| IBKR Flex | Stub tipado |

Punto de entrada: `src/lib/imports/`. UI: `/transactions/import`.

---

## Despliegue

Checklist Vercel + Turso: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Config presente: `vercel.json` (framework Next.js, región `iad1`).

---

## Roadmap

| Fase | Contenido |
|------|-----------|
| **0–1** (actual) | Auth, CRUD, land, dashboard, snapshots, FX manual, imports defensivos |
| **2** | FX/precios API, parsers Auto-Invest + IBKR, cron snapshots, TOTP |
| **3** | Compliance España 720/721, FIRE |
| **4** | Notificaciones, backup, PWA, export PDF |

Historial de cambios: [CHANGELOG.md](CHANGELOG.md).

---

## Documentación adicional

| Doc | Contenido |
|-----|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Capas, módulos, flujos |
| [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md) | Contexto para Cloud/Desktop Agents |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Env vars y secretos |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Turso |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Flujo de trabajo local |
| [SECURITY.md](SECURITY.md) | Prácticas de seguridad |
| [CHANGELOG.md](CHANGELOG.md) | Versiones |
| [AGENTS.md](AGENTS.md) | Notas Next.js 16 para agentes |

---

## Seguridad

App de finanzas personales: trata credenciales y datos como sensibles. Ver [SECURITY.md](SECURITY.md).

- No commits de `.env.local`, dumps ni CSV con PII
- Rota `AUTH_SECRET` / contraseñas si se filtran
- No pegues PATs de GitHub en el chat; usa secrets del entorno

---

## Contribuir / handoff de agentes

1. Trabaja sobre `main` (o una feature branch `cursor/...`)
2. `npm run lint` y `npm run build` antes de merge
3. Actualiza `CHANGELOG.md` en cambios relevantes
4. Lee [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md) si eres un agente nuevo

Prompt sugerido para el siguiente agente:

```text
Repo: https://github.com/Renevc14/FinancesTracker (rama main).
Lee README.md y docs/AGENT_HANDOFF.md.
Arranca en local (db:push, db:seed, npm run dev) y continúa el backlog de Fase 2
salvo que el usuario indique otra prioridad.
```
