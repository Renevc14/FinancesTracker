export function isTursoUrl(url: string): boolean {
  return url.startsWith("libsql:") || url.startsWith("https://");
}

function isVercelProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function databaseUrl(): string {
  const primary = process.env.DATABASE_URL?.trim();
  const turso = process.env.TURSO_DATABASE_URL?.trim();

  if (process.env.VERCEL) {
    const url = [turso, primary].find((value) => value && isTursoUrl(value));
    if (url) return url;
    // `next build` on Vercel sets VERCEL=1 before runtime env is needed.
    if (isVercelProductionBuild()) {
      return "file:/tmp/folio-vercel-build.db";
    }
    throw new Error(
      "On Vercel, set TURSO_DATABASE_URL or DATABASE_URL to a libsql:// Turso URL. Do not use file: SQLite.",
    );
  }

  return primary || turso || "file:./data/portfolio.db";
}

export function databaseAuthToken(): string | undefined {
  const token =
    process.env.DATABASE_AUTH_TOKEN?.trim() ||
    process.env.TURSO_AUTH_TOKEN?.trim();
  return token || undefined;
}

export function assertVercelUsesTurso(url: string): void {
  if (!process.env.VERCEL || isVercelProductionBuild()) return;
  if (!isTursoUrl(url)) {
    throw new Error(
      "On Vercel, set TURSO_DATABASE_URL or DATABASE_URL to a libsql:// Turso URL. Do not use file: SQLite.",
    );
  }
  if (!databaseAuthToken()) {
    throw new Error(
      "On Vercel, set TURSO_AUTH_TOKEN or DATABASE_AUTH_TOKEN.",
    );
  }
}
