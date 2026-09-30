import { config } from "dotenv";
config({ path: ".env.local" });

if (process.env.TURSO_DATABASE_URL) {
  process.env.VERCEL = "1";
}

async function main() {
  const { cleanupExtraDownPayments, listLandLots } = await import(
    "../src/lib/services/land"
  );
  const before = await listLandLots();
  for (const lot of before) {
    const initials = lot.payments.filter((p) => p.concept === "initial");
    console.log({
      ticker: lot.asset.ticker,
      payments: lot.payments.map((p) => ({
        id: p.id.slice(0, 8),
        concept: p.concept,
        date: p.date,
        amountLocal: p.amountLocal,
        createdAt: p.createdAt,
      })),
      initials: initials.length,
    });
  }
  const result = await cleanupExtraDownPayments();
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
