export function databaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.TURSO_DATABASE_URL?.trim() ||
    "file:./data/portfolio.db"
  );
}

export function databaseAuthToken(): string | undefined {
  const token =
    process.env.DATABASE_AUTH_TOKEN?.trim() ||
    process.env.TURSO_AUTH_TOKEN?.trim();
  return token || undefined;
}

export function isTursoUrl(url: string): boolean {
  return url.startsWith("libsql:") || url.startsWith("https://");
}

export function assertVercelUsesTurso(url: string): void {
  if (process.env.VERCEL && !isTursoUrl(url)) {
    throw new Error(
      "On Vercel, set DATABASE_URL (or TURSO_DATABASE_URL) to a libsql:// Turso URL.",
    );
  }
}
