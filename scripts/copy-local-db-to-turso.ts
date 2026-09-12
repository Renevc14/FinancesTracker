import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

function resolveFileUrl(url: string): string {
  if (!url.startsWith("file:")) return url;
  const filePath = url.replace(/^file:/, "");
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  return `file:${absolute}`;
}

function sourceUrl(): string {
  const explicit = process.env.SOURCE_DATABASE_URL?.trim();
  if (explicit) return resolveFileUrl(explicit);
  const current = process.env.DATABASE_URL?.trim();
  if (current?.startsWith("file:")) return resolveFileUrl(current);
  return resolveFileUrl("file:./data/portfolio.db");
}

function destUrl(): string {
  return (
    process.env.DEST_DATABASE_URL?.trim() ||
    process.env.TURSO_DATABASE_URL?.trim() ||
    ""
  );
}

async function main() {
  const from = sourceUrl();
  const to = destUrl();
  const token = (
    process.env.DEST_DATABASE_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    ""
  ).trim();

  if (!from.startsWith("file:")) {
    throw new Error("Source must be a local file: SQLite URL.");
  }
  if (!to.startsWith("libsql:") && !to.startsWith("https:")) {
    throw new Error(
      "Set TURSO_DATABASE_URL (or DEST_DATABASE_URL) to a libsql:// URL.",
    );
  }
  if (!token) {
    throw new Error("Set TURSO_AUTH_TOKEN (or DATABASE_AUTH_TOKEN).");
  }

  const local = createClient({ url: from });
  const remote = createClient({ url: to, authToken: token });

  const schemaRes = await local.execute(
    `SELECT type, name, sql FROM sqlite_master
     WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
     ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name`,
  );
  for (const row of schemaRes.rows) {
    const sql = String(row.sql);
    console.log(`Ensuring ${String(row.type)} ${String(row.name)}`);
    try {
      await remote.execute(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/already exists/i.test(message)) {
        console.log(`  already exists, skip`);
        continue;
      }
      throw err;
    }
  }

  const tablesRes = await local.execute(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  );
  const tables = tablesRes.rows.map((row) => String(row.name));

  await remote.execute("PRAGMA foreign_keys = OFF");
  try {
    for (const table of tables) {
      const rows = await local.execute(`SELECT * FROM "${table}"`);
      const cols = rows.columns;
      if (cols.length === 0) continue;
      console.log(`Copying ${table} (${rows.rows.length} rows)`);
      const placeholders = cols.map(() => "?").join(", ");
      const colList = cols.map((col) => `"${col}"`).join(", ");
      const sql = `INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders})`;
      const chunkSize = 80;
      for (let i = 0; i < rows.rows.length; i += chunkSize) {
        const chunk = rows.rows.slice(i, i + chunkSize);
        await remote.batch(
          chunk.map((row) => ({
            sql,
            args: cols.map((col) => row[col] as string | number | null),
          })),
          "write",
        );
        console.log(
          `  ${Math.min(i + chunkSize, rows.rows.length)}/${rows.rows.length}`,
        );
      }
    }
  } finally {
    await remote.execute("PRAGMA foreign_keys = ON");
  }

  console.log("Copied local SQLite into Turso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
