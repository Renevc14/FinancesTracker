import { getDisplayFx, getPortfolioDashboard } from "@/lib/services/portfolio";
import { db } from "@/lib/db";

export type ComplianceBand = "green" | "yellow" | "red";

export type ComplianceStatus = {
  thresholdEur: number;
  totalEur: number;
  pctOfThreshold: number;
  band: ComplianceBand;
  byClass: Array<{ class: string; valueEur: number; pct: number }>;
};

export async function getSpain720Status(): Promise<ComplianceStatus> {
  const dash = await getPortfolioDashboard();
  const config = await db.query.userConfig.findFirst();
  const thresholdEur = config?.eurUsdThreshold ?? 50_000;
  const usdToEur = await getDisplayFx("EUR");
  const totalEur = dash.totalMarketValueUsd * usdToEur;
  const pctOfThreshold = thresholdEur > 0 ? (totalEur / thresholdEur) * 100 : 0;
  const band: ComplianceBand =
    pctOfThreshold >= 100 ? "red" : pctOfThreshold >= 80 ? "yellow" : "green";

  return {
    thresholdEur,
    totalEur,
    pctOfThreshold,
    band,
    byClass: dash.byClass.map((c) => ({
      class: c.class,
      valueEur: c.marketValueUsd * usdToEur,
      pct: thresholdEur > 0 ? (c.marketValueUsd * usdToEur) / thresholdEur * 100 : 0,
    })),
  };
}
