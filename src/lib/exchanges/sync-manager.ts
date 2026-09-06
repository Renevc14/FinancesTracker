import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiCredentials, assets, reconciliationLogs, syncJobs, syncLogs } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto/encryption";
import { getPortfolioDashboard } from "@/lib/services/portfolio";
import { BinanceClient } from "./binance";
import type { ExchangeClient } from "./types";

const locks = new Set<string>();

function clientFor(
  provider: string,
  apiKey: string,
  apiSecret: string,
): ExchangeClient {
  if (provider === "binance") return new BinanceClient(apiKey, apiSecret);
  throw new Error(`Provider ${provider} aún no tiene cliente (Kraken en 2027)`);
}

export async function runSync(
  credentialId: string,
  triggeredBy: "cron" | "manual" | "onboarding",
) {
  if (locks.has(credentialId)) {
    throw new Error("Ya hay un sync en curso para esta credencial");
  }
  locks.add(credentialId);

  const [cred] = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.id, credentialId))
    .limit(1);
  if (!cred || !cred.active) {
    locks.delete(credentialId);
    throw new Error("Credencial no encontrada o inactiva");
  }

  const [job] = await db
    .insert(syncJobs)
    .values({
      credentialId,
      triggeredBy,
      status: "running",
    })
    .returning();

  try {
    const apiKey = decryptSecret(cred.apiKeyCipher);
    const apiSecret = decryptSecret(cred.apiSecretCipher);
    const client = clientFor(cred.provider, apiKey, apiSecret);
    const test = await client.testConnection();
    await db.insert(syncLogs).values({
      syncJobId: job.id,
      level: test.ok ? "info" : "error",
      message: test.ok ? "Conexión OK" : (test.error ?? "Fallo de conexión"),
    });

    if (!test.ok) {
      await db
        .update(syncJobs)
        .set({
          status: "failed",
          finishedAt: new Date().toISOString(),
          errors: [test.error ?? "testConnection failed"],
        })
        .where(eq(syncJobs.id, job.id));
      await db
        .update(apiCredentials)
        .set({
          lastVerifiedAt: new Date().toISOString(),
          lastVerificationStatus: "invalid",
        })
        .where(eq(apiCredentials.id, cred.id));
      return job.id;
    }

    const balances = await client.getBalances();
    const dash = await getPortfolioDashboard();
    const threshold =
      (await db.query.userConfig.findFirst())?.reconciliationDriftThreshold ??
      0.005;

    let warnings = 0;
    for (const b of balances) {
      const holding = dash.holdings.find(
        (h) => h.ticker.toUpperCase() === b.asset.toUpperCase(),
      );
      const asset = await db.query.assets.findFirst({
        where: eq(assets.ticker, b.asset),
      });
      if (!asset) continue;
      const apiBal = Number(b.total);
      const dbBal = holding?.quantity ?? 0;
      const driftAbs = Math.abs(apiBal - dbBal);
      const driftPct = apiBal !== 0 ? driftAbs / apiBal : driftAbs > 0 ? 1 : 0;
      const status =
        driftPct > 0.05 ? "critical" : driftPct > threshold ? "warning" : "ok";
      if (status !== "ok") warnings += 1;
      await db.insert(reconciliationLogs).values({
        syncJobId: job.id,
        assetId: asset.id,
        apiBalance: apiBal,
        dbBalance: dbBal,
        driftAbsolute: driftAbs,
        driftPct,
        status,
      });
    }

    await db
      .update(syncJobs)
      .set({
        status: warnings > 0 ? "partial" : "success",
        finishedAt: new Date().toISOString(),
        recordsFetched: balances.length,
      })
      .where(eq(syncJobs.id, job.id));
    await db
      .update(apiCredentials)
      .set({
        lastVerifiedAt: new Date().toISOString(),
        lastVerificationStatus: "ok",
      })
      .where(eq(apiCredentials.id, cred.id));
    return job.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await db.insert(syncLogs).values({
      syncJobId: job.id,
      level: "error",
      message,
    });
    await db
      .update(syncJobs)
      .set({
        status: "failed",
        finishedAt: new Date().toISOString(),
        errors: [message],
      })
      .where(eq(syncJobs.id, job.id));
    throw err;
  } finally {
    locks.delete(credentialId);
  }
}

export async function listSyncJobs(limit = 20) {
  return db.select().from(syncJobs).orderBy(desc(syncJobs.startedAt)).limit(limit);
}

export async function listOpenDrifts() {
  return db
    .select()
    .from(reconciliationLogs)
    .where(eq(reconciliationLogs.resolved, false))
    .orderBy(desc(reconciliationLogs.createdAt));
}
