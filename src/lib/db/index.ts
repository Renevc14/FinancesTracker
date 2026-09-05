import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type AppDatabase = LibSQLDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __portfolioDb: AppDatabase | undefined;
  // eslint-disable-next-line no-var
  var __portfolioClient: Client | undefined;
}

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/portfolio.db";
  if (url.startsWith("file:")) {
    const filePath = url.replace(/^file:/, "");
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    return `file:${absolute}`;
  }
  return url;
}

function createDb(): AppDatabase {
  const url = resolveDatabaseUrl();
  const client =
    globalThis.__portfolioClient ??
    createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__portfolioClient = client;
  }

  return drizzle(client, { schema });
}

export const db: AppDatabase = globalThis.__portfolioDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__portfolioDb = db;
}

export { schema };
