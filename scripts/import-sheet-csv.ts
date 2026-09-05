/**
 * One-off CSV import from Google Sheet exports.
 *
 * Expected usage (Phase 1+):
 *   npx tsx --env-file=.env.local scripts/import-sheet-csv.ts ./exports/transactions.csv
 *
 * Phase 0: stub only — parsers for Binance Spot / Auto-Invest / IBKR land in Phase 2.
 */
import fs from "node:fs";
import path from "node:path";

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error(
      "Usage: npx tsx --env-file=.env.local scripts/import-sheet-csv.ts <path-to-csv>",
    );
    process.exit(1);
  }

  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) {
    console.error(`File not found: ${absolute}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(absolute, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  console.log(`Read ${lines.length} lines from ${absolute}`);
  console.log(
    "CSV import parsers (Binance Spot, Auto-Invest, IBKR Flex) ship in Phase 2.",
  );
  console.log(
    "For now: enter transactions via /transactions/new or extend this script.",
  );
}

main();
