import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "file:./data/portfolio.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

const statements = [
  `CREATE TABLE IF NOT EXISTS api_credentials (
    id text PRIMARY KEY NOT NULL,
    provider text NOT NULL,
    label text NOT NULL,
    api_key_cipher text NOT NULL,
    api_secret_cipher text NOT NULL,
    additional_config text DEFAULT '{}',
    last_verified_at text,
    last_verification_status text DEFAULT 'ok',
    active integer NOT NULL DEFAULT 1,
    revoked_at text,
    created_at text DEFAULT (datetime('now')) NOT NULL,
    updated_at text DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_jobs (
    id text PRIMARY KEY NOT NULL,
    credential_id text NOT NULL REFERENCES api_credentials(id),
    triggered_by text NOT NULL,
    started_at text DEFAULT (datetime('now')) NOT NULL,
    finished_at text,
    status text DEFAULT 'running' NOT NULL,
    records_fetched integer DEFAULT 0 NOT NULL,
    records_new integer DEFAULT 0 NOT NULL,
    records_duplicate integer DEFAULT 0 NOT NULL,
    records_updated integer DEFAULT 0 NOT NULL,
    errors text DEFAULT '[]',
    created_at text DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_logs (
    id text PRIMARY KEY NOT NULL,
    sync_job_id text NOT NULL REFERENCES sync_jobs(id),
    level text NOT NULL,
    message text NOT NULL,
    context text,
    timestamp text DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reconciliation_logs (
    id text PRIMARY KEY NOT NULL,
    sync_job_id text NOT NULL REFERENCES sync_jobs(id),
    asset_id text NOT NULL REFERENCES assets(id),
    api_balance real NOT NULL,
    db_balance real NOT NULL,
    drift_absolute real NOT NULL,
    drift_pct real NOT NULL,
    status text NOT NULL,
    resolved integer DEFAULT 0 NOT NULL,
    resolution_action text,
    resolution_notes text,
    resolved_at text,
    created_at text DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bank_accounts (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    bank text NOT NULL,
    account_number text,
    currency text DEFAULT 'BOB' NOT NULL,
    account_type text DEFAULT 'checking' NOT NULL,
    country text DEFAULT 'BO' NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    created_at text DEFAULT (datetime('now')) NOT NULL,
    updated_at text DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bank_balance_snapshots (
    id text PRIMARY KEY NOT NULL,
    account_id text NOT NULL REFERENCES bank_accounts(id),
    date text NOT NULL,
    balance_local real NOT NULL,
    fx_rate real NOT NULL,
    balance_usd real NOT NULL,
    notes text,
    source text DEFAULT 'manual' NOT NULL,
    created_at text DEFAULT (datetime('now')) NOT NULL
  )`,
];

async function main() {
  for (const sql of statements) {
    await client.execute(sql);
  }
  for (const col of [
    "ALTER TABLE user_config ADD COLUMN reconciliation_drift_threshold real DEFAULT 0.005",
    "ALTER TABLE user_config ADD COLUMN sync_schedule text DEFAULT '0 6 * * *'",
  ]) {
    try {
      await client.execute(col);
    } catch {
      /* already exists */
    }
  }
  console.log("Fase 2 tables ensured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
