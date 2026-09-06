import { getSpain720Status } from "@/lib/services/compliance";
import { classLabel } from "@/lib/labels";
import { formatMoney, formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BAND: Record<string, string> = {
  green: "text-[var(--positive)]",
  yellow: "text-[var(--warn)]",
  red: "text-[var(--danger)]",
};

export default async function CompliancePage() {
  const status = await getSpain720Status();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ios-large-title">Modelo 720/721</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Umbral informativo — no calcula liquidación
        </p>
      </div>
      <section className="ios-group p-4 space-y-2">
        <p className={`ios-headline ${BAND[status.band]}`}>
          {formatPct(status.pctOfThreshold)} del umbral
        </p>
        <p className="money text-[22px] font-semibold">
          {formatMoney(status.totalEur, "EUR")}
        </p>
        <p className="text-[13px] text-[var(--muted)]">
          Umbral {formatMoney(status.thresholdEur, "EUR")}
        </p>
      </section>
      <ul className="ios-group">
        {status.byClass.map((c) => (
          <li key={c.class} className="ios-row">
            <span className="text-[15px]">{classLabel(c.class)}</span>
            <span className="money text-[15px]">
              {formatMoney(c.valueEur, "EUR")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
