import { NextResponse } from "next/server";
import { captureMonthlySnapshot } from "@/lib/services/snapshot";
import { refreshLiveMarkets } from "@/lib/services/market";
import { runSync } from "@/lib/exchanges/sync-manager";
import { db } from "@/lib/db";
import { apiCredentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const creds = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.active, true));

  let markets: { prices: number; fx: number } | null = null;
  try {
    markets = await refreshLiveMarkets();
  } catch (err) {
    console.error("[cron markets]", err);
  }

  const syncIds: string[] = [];
  for (const cred of creds) {
    try {
      syncIds.push(await runSync(cred.id, "cron"));
    } catch (err) {
      console.error("[cron sync]", cred.id, err);
    }
  }

  const snap = await captureMonthlySnapshot("cron");
  return NextResponse.json({
    ok: true,
    markets,
    syncIds,
    snapshot: snap?.snapshotDate,
  });
}
