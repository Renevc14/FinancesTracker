import { getFireProjection } from "@/lib/services/fire";
import { formatMoney, formatPct } from "@/lib/utils";
import { FireConfigForm } from "@/components/forms/fire-config-form";

export const dynamic = "force-dynamic";

export default async function FirePage() {
  const fire = await getFireProjection();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ios-large-title">FIRE</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Proyección con el patrimonio actual (incluye lotes al costo)
        </p>
      </div>
      <dl className="ios-group">
        <div className="ios-row">
          <dt className="text-[15px]">Hoy</dt>
          <dd className="money text-[15px] font-semibold">
            {formatMoney(fire.currentUsd, "USD")}
          </dd>
        </div>
        <div className="ios-row">
          <dt className="text-[15px]">Meta</dt>
          <dd className="money text-[15px] font-semibold">
            {formatMoney(fire.targetUsd, "USD")}
          </dd>
        </div>
        <div className="ios-row">
          <dt className="text-[15px]">Aporte / mes</dt>
          <dd className="money text-[15px]">
            {formatMoney(fire.monthlyContribution, "USD")}
          </dd>
        </div>
        <div className="ios-row">
          <dt className="text-[15px]">Retorno esperado</dt>
          <dd className="text-[15px]">{formatPct(fire.expectedReturn * 100)}</dd>
        </div>
        <div className="ios-row">
          <dt className="text-[15px]">Años a la meta</dt>
          <dd className="text-[15px] font-semibold">
            {fire.yearsToTarget == null ? "—" : fire.yearsToTarget.toFixed(1)}
          </dd>
        </div>
        <div className="ios-row">
          <dt className="text-[15px]">Coast FIRE (años)</dt>
          <dd className="text-[15px]">
            {fire.coastYears == null ? "—" : fire.coastYears.toFixed(1)}
          </dd>
        </div>
        {fire.requiredMonthly != null && (
          <div className="ios-row">
            <dt className="text-[15px]">Aporte para la fecha meta</dt>
            <dd className="money text-[15px]">
              {formatMoney(fire.requiredMonthly, "USD")}
            </dd>
          </div>
        )}
      </dl>
      <section className="ios-group space-y-3 p-4">
        <h2 className="ios-title">Ajustes de proyección</h2>
        <FireConfigForm
          target={fire.targetUsd}
          monthly={fire.monthlyContribution}
          expectedReturn={fire.expectedReturn}
          targetDate={fire.targetDate}
        />
      </section>
    </div>
  );
}
