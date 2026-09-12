import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import {
  databaseAuthToken,
  databaseUrl,
  isTursoUrl,
} from "./src/lib/db/env";

config({ path: ".env.local" });

const url = databaseUrl();
const authToken = databaseAuthToken();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: isTursoUrl(url) ? "turso" : "sqlite",
  dbCredentials: authToken ? { url, authToken } : { url },
});
