#!/bin/sh
set -e

mkdir -p /app/data

if [ ! -x node_modules/.bin/next ]; then
  echo "Installing npm dependencies…"
  npm ci
fi

echo "Applying database schema…"
if ! npm run db:push; then
  echo "Warning: drizzle-kit push failed; continuing with existing database."
fi

echo "Ensuring Fase 2 tables…"
npx tsx --env-file=.env.local scripts/ensure-fase2.ts || echo "Warning: ensure-fase2 failed."

if [ ! -f /app/data/.seeded ]; then
  echo "Seeding database…"
  npm run db:seed
  touch /app/data/.seeded
else
  echo "Seed already applied (data/.seeded present). Skipping."
fi

echo "Starting Next.js on 0.0.0.0:3000…"
exec npx next dev --hostname 0.0.0.0 --port 3000
