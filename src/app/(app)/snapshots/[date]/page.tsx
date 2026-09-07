import Link from "next/link";
import { notFound } from "next/navigation";
import { getSnapshot } from "@/lib/services/snapshot";
import { classLabel } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const snap = await getSnapshot(date);
  if (!snap) notFound();

  const byClass = Object.entries(snap.byClass);
  const byAsset = Object.values(snap.byAsset);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/snapshots" className="ios-back">
          ‹ Snapshots
        </Link>
        <h1 className="ios-large-title">{formatDate(snap.snapshotDate)}</h1>
      </div>

      <section className="ios-group">
        <div className="grid grid-cols-2">
          <Tile label="Cost" value={formatMoney(snap.totalInvestedUsd, "USD")} />
          <Tile
            label="Value"
            value={formatMoney(snap.totalMarketValueUsd, "USD")}
            border
          />
          <Tile
            label="Lots"
            value={formatMoney(snap.landPaidUsd, "USD")}
            top
          />
          <Tile
            label="Month in"
            value={formatMoney(snap.monthlyContributionUsd, "USD")}
            border
            top
          />
        </div>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">By class</p>
        <ul className="ios-group">
          {byClass.map(([cls, v]) => (
            <li key={cls} className="ios-row">
              <span className="text-[17px]">{classLabel(cls)}</span>
              <span className="money text-[17px]">
                {formatMoney(v.value, "USD")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">By asset</p>
        <ul className="ios-group">
          {byAsset.map((a) => (
            <li key={a.ticker} className="ios-row">
              <span className="text-[17px]">
                {a.ticker}{" "}
                <span className="text-[15px] text-[var(--muted)]">
                  · {classLabel(a.class)}
                </span>
              </span>
              <span className="money text-[17px]">
                {formatMoney(a.value, "USD")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  border,
  top,
}: {
  label: string;
  value: string;
  border?: boolean;
  top?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3.5 ${border ? "border-l border-[var(--separator)]" : ""} ${top ? "border-t border-[var(--separator)]" : ""}`}
    >
      <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
      <p className="money mt-1 text-[17px] font-semibold">{value}</p>
    </div>
  );
}
