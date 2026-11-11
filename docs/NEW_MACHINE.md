# Cambio de computadora

La historia de chats de Cursor **no viaja** con el repo. Lo que sí viaja es GitHub + esta documentación. Los **datos reales** viven en Turso (producción), no en git.

## Qué no está en el remoto (a propósito)

| Cosa | Dónde está | Qué hacer |
|------|------------|-----------|
| `.env.local` | PC vieja, gitignored | Copiar el archivo **o** rellenar desde Vercel (abajo) |
| `/data/portfolio.db` | SQLite local, gitignored | Opcional. Producción **no** lo usa |
| `/data/receipts/` | Comprobantes de cuotas | Copiar la carpeta si los quieres en local |
| Secretos Vercel/Turso | Dashboards | No se commitean; hay que copiarlos a mano |
| Chats de agentes | Cursor local | Irrecuperables; usa este doc + `AGENT_HANDOFF.md` |

Nunca subas `.env.local`, `*.db` ni keys de Binance.

## Checklist antes de apagar el PC viejo

1. Confirma que `git status` está limpio y `main` = `origin/main`.
2. Copia `.env.local` a un USB / gestor de contraseñas (es el más fácil de restaurar).
3. En Vercel → Project → Settings → Environment Variables, anota o exporta (sin pegarlos en el chat):
   - `AUTH_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD`
   - `AUTH_URL`, `AUTH_TRUST_HOST`
   - `DATABASE_URL` o `TURSO_DATABASE_URL`
   - `DATABASE_AUTH_TOKEN` o `TURSO_AUTH_TOKEN`
   - `CRON_SECRET`
   - `AUTH_TOTP_SECRET` si lo usas
4. En Turso: URL de la DB `folio` y un token vigente.
5. Opcional: zip de `/data` (sqlite + receipts) si quieres el mismo SQLite local.
6. GitHub: la cuenta que puede hacer **push** es **[Renevc14](https://github.com/Renevc14)**. `Renevc591` recibe 403 en este repo.

`vercel env pull` **no** trae bien los secretos de Turso (salen placeholders). No confíes en eso como backup.

## Arranque en el PC nuevo

```bash
git clone https://github.com/Renevc14/FinancesTracker.git
cd FinancesTracker
git checkout main
git pull origin main
```

GitHub CLI (para `git push` y `gh`): inicia sesión como **Renevc14**.

```bash
cp .env.example .env.local
# Pega AUTH_* y, si vas a hablar con Turso, las URLs/tokens.
```

### Local contra SQLite vacío (demo)

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Eso **no** es tu patrimonio de producción. Login será el de `.env.local`.

### Local contra Turso (mismos datos que prod)

En `.env.local` pon `DATABASE_URL=libsql://…` y `DATABASE_AUTH_TOKEN=…` (o los alias `TURSO_*`). **No** hagas `db:seed`.

`AUTH_SECRET` **debe ser el mismo que en Vercel**. Las API keys de Binance están cifradas con ese secreto. Si lo cambias, el sync falla al descifrar: hay que volver a pegar la key en Settings → API keys.

### Local con el sqlite viejo

Copia `data/portfolio.db` (y `data/receipts` si aplica) al nuevo `data/`. `DATABASE_URL=file:./data/portfolio.db`. Mismo `AUTH_SECRET` que cuando se guardó la key de Binance en ese archivo.

## Producción (no se “mueve”)

| | |
|---|---|
| App | https://finances-tracker-eight.vercel.app |
| Deploy | Push a `main` → Vercel (solo `main`; otras ramas se ignoran) |
| DB | Turso LibSQL |
| Región de funciones | `fra1` (Frankfurt) en `vercel.json` — **no** `iad1` |
| Cron | `5 6 * * *` UTC → `/api/cron/daily` (02:05 America/La_Paz) |

La app en Vercel sigue igual al cambiar de PC. Solo necesitas el login de producción (Vercel env), no el sqlite local.

## Primer agente en el PC nuevo

Pega esto en el chat:

```text
Repo: https://github.com/Renevc14/FinancesTracker (rama main).
Lee README.md, docs/AGENT_HANDOFF.md, docs/ARCHITECTURE.md y docs/NEW_MACHINE.md.
No inventes multi-tenant. No commitees .env.local ni /data.
```
