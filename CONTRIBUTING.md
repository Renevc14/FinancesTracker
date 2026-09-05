# Contributing

Personal project — contributions are mainly from the owner and coding agents.

## Workflow

1. Sync `main`
2. Create a feature branch (`cursor/<short-name>-<id>` in Cloud Agents)
3. Implement with focused commits
4. Run checks:

```bash
npm run lint
npm run build
```

5. Update `CHANGELOG.md` under `[Unreleased]` when behavior changes
6. Open PR into `main` (or push `main` directly for solo work)
7. Do not commit secrets, SQLite files, or `.env.local`

## Code style

- TypeScript throughout
- Server Actions for mutations; Zod at the boundary
- Match existing UI tokens (Apple HIG); avoid inventing a second design system
- Prefer small, readable modules over premature abstractions

## Database changes

1. Edit `src/lib/db/schema.ts`
2. `npm run db:push` (dev) or generate migrations with `npm run db:generate` when introducing a migration workflow
3. Update seed if new required rows are needed
4. Document breaking schema changes in `CHANGELOG.md`

## Imports / parsers

- Add typed contracts in `src/lib/imports/types.ts`
- Keep parsers pure and unit-smokeable (`scripts/smoke-*.ts`)
- Enforce dedupe via `(importedFrom, importRef)`
