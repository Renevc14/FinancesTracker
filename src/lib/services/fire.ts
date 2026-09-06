import { getPortfolioDashboard } from "@/lib/services/portfolio";
import { db } from "@/lib/db";

export type FireProjection = {
  currentUsd: number;
  targetUsd: number;
  targetDate: string | null;
  expectedReturn: number;
  monthlyContribution: number;
  yearsToTarget: number | null;
  coastYears: number | null;
  requiredMonthly: number | null;
};

function yearsToGoal(
  current: number,
  target: number,
  monthly: number,
  annualReturn: number,
): number | null {
  if (target <= current) return 0;
  const r = annualReturn / 12;
  if (r === 0) {
    if (monthly <= 0) return null;
    return (target - current) / monthly / 12;
  }
  for (let m = 1; m <= 12 * 80; m++) {
    const fv =
      current * (1 + r) ** m + monthly * (((1 + r) ** m - 1) / r);
    if (fv >= target) return m / 12;
  }
  return null;
}

export async function getFireProjection(): Promise<FireProjection> {
  const dash = await getPortfolioDashboard();
  const config = await db.query.userConfig.findFirst();
  const currentUsd = dash.totalMarketValueUsd;
  const targetUsd = config?.fireTargetAmount ?? 1_000_000;
  const expectedReturn = config?.fireExpectedReturn ?? 0.07;
  const monthlyContribution = config?.fireExpectedContribution ?? 2000;

  const yearsToTarget = yearsToGoal(
    currentUsd,
    targetUsd,
    monthlyContribution,
    expectedReturn,
  );
  const coastYears = yearsToGoal(currentUsd, targetUsd, 0, expectedReturn);

  let requiredMonthly: number | null = null;
  if (config?.fireTargetDate) {
    const years =
      (Date.parse(config.fireTargetDate) - Date.now()) / (365.25 * 24 * 3600 * 1000);
    if (years > 0) {
      const r = expectedReturn / 12;
      const n = years * 12;
      if (r === 0) {
        requiredMonthly = (targetUsd - currentUsd) / n;
      } else {
        const fvCurrent = currentUsd * (1 + r) ** n;
        requiredMonthly =
          (targetUsd - fvCurrent) * (r / ((1 + r) ** n - 1));
      }
    }
  }

  return {
    currentUsd,
    targetUsd,
    targetDate: config?.fireTargetDate ?? null,
    expectedReturn,
    monthlyContribution,
    yearsToTarget,
    coastYears,
    requiredMonthly,
  };
}
