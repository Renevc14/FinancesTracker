import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import type { ImportSource, ParsedTrade } from "@/lib/imports/types";

/**
 * Split trades into fresh vs already-imported (importedFrom + importRef).
 */
export async function partitionDuplicates(
  source: ImportSource,
  trades: ParsedTrade[],
): Promise<{ fresh: ParsedTrade[]; duplicates: ParsedTrade[] }> {
  const refs = [
    ...new Set(
      trades
        .map((t) => t.importRef?.trim())
        .filter((r): r is string => !!r && r.length > 0),
    ),
  ];

  if (refs.length === 0) {
    return { fresh: [], duplicates: [] };
  }

  const existing = await db
    .select({ importRef: transactions.importRef })
    .from(transactions)
    .where(
      and(
        eq(transactions.importedFrom, source),
        inArray(transactions.importRef, refs),
        isNull(transactions.deletedAt),
      ),
    );

  const existingSet = new Set(
    existing.map((e) => e.importRef).filter((r): r is string => !!r),
  );

  const fresh: ParsedTrade[] = [];
  const duplicates: ParsedTrade[] = [];
  for (const t of trades) {
    if (!t.importRef?.trim()) continue;
    if (existingSet.has(t.importRef)) duplicates.push(t);
    else fresh.push(t);
  }
  return { fresh, duplicates };
}
