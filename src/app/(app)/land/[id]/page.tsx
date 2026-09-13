import Link from "next/link";
import { notFound } from "next/navigation";
import { LandPaymentForm } from "@/components/forms/land-payment-form";
import { LandValueForm } from "@/components/forms/land-value-form";
import { LandTabs, type LandTabId } from "@/components/land/land-tabs";
import { Progress } from "@/components/ui/progress";
import { getLatestFxRate } from "@/lib/services/fx";
import { getLandLot } from "@/lib/services/land";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONCEPT_LABELS: Record<string, string> = {
  reservation: "Reservation",
  initial: "Down payment",
  installment: "Installment",
  balloon: "Balloon",
  tax: "IT",
  notary: "Notary",
  other: "Other",
};

export default async function LandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const lot = await getLandLot(id);
  if (!lot) notFound();
  const fx = (await getLatestFxRate("USD", "BOB")) ?? 12.3;
  const defaultTab: LandTabId =
    tab === "payments" ||
    tab === "contract" ||
    tab === "schedule" ||
    tab === "status"
      ? tab
      : "status";

  const overdue = lot.schedule.filter((s) => s.status === "overdue");
  const upcoming = lot.schedule.filter(
    (s) => s.status === "upcoming" || s.status === "due",
  );
  const nowPerM2 =
    lot.currentPricePerM2Local ?? lot.contractPricePerM2Local;
  const lotNowLocal = nowPerM2 * lot.contract.surfaceM2;
  const lotNowUsd =
    lot.contract.estimatedValueUsd ??
    (fx > 0 ? lotNowLocal / fx : 0);
  const vsContractLocal = lotNowLocal - lot.contract.priceLocal;
  const vsPaidUsd = lot.equityUsd - lot.paidUsd;

  const statusPanel = (
    <section className="space-y-3">
      <div className="ios-group">
        <div className="grid grid-cols-2">
          <Stat
            label="Contract"
            value={formatMoney(lot.contract.priceLocal, "BOB")}
          />
          <Stat
            label="Paid"
            value={formatMoney(lot.paidLocal, "BOB")}
            border
          />
          <Stat
            label="Paid USD"
            value={formatMoney(lot.paidUsd, "USD")}
            top
          />
          <Stat
            label="Balance"
            value={formatMoney(lot.remainingLocal, "BOB")}
            border
            top
          />
        </div>
      </div>
      <Progress value={lot.paidPct} />

      <div className="ios-group">
        <div className="grid grid-cols-2">
          <Stat
            label="Frozen Bs/m²"
            value={formatMoney(lot.contractPricePerM2Local, "BOB")}
          />
          <Stat
            label="Now Bs/m²"
            value={formatMoney(nowPerM2, "BOB")}
            border
          />
          <Stat
            label="Lot now"
            value={formatMoney(lotNowUsd, "USD")}
            top
          />
          <Stat
            label="In NAV"
            value={formatMoney(lot.equityUsd, "USD")}
            border
            top
          />
        </div>
      </div>
      <p className="px-0.5 text-[13px] text-[var(--muted)]">
        {vsContractLocal >= 0 ? "+" : "−"}
        {formatMoney(Math.abs(vsContractLocal), "BOB")} vs contract
        {lot.paidUsd > 0
          ? ` · NAV ${vsPaidUsd >= 0 ? "+" : "−"}${formatMoney(Math.abs(vsPaidUsd), "USD")} vs paid`
          : ""}
      </p>

      <div className="ios-group p-4">
        <LandValueForm
          landAssetId={lot.asset.id}
          surfaceM2={lot.contract.surfaceM2}
          contractPricePerM2Local={lot.contractPricePerM2Local}
          defaultPricePerM2Local={nowPerM2}
          fxRate={fx}
        />
      </div>

      <Link
        href={`/pagos/nuevo?lote=${lot.asset.id}`}
        className="ios-pressable inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-[17px] font-semibold text-[var(--accent-fg)]"
      >
        Pay
      </Link>
    </section>
  );

  const contractPanel = (
    <section className="space-y-3">
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Item label="Seller" value={lot.contract.seller} />
        <Item label="Developer" value={lot.contract.developer ?? "—"} />
        <Item label="Location" value={lot.contract.location} />
        <Item label="Title" value={lot.contract.matricula} />
        <Item label="Area" value={`${lot.contract.surfaceM2} m²`} />
        <Item label="Signed" value={formatDate(lot.contract.signingDate)} />
        <Item
          label="Plan"
          value={lot.contract.paymentPlan.code ?? "installments + balloon"}
        />
      </dl>
      {lot.contract.contractClauses &&
        Object.keys(lot.contract.contractClauses).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Key clauses
            </p>
            <ul className="space-y-2 text-sm">
              {Object.entries(lot.contract.contractClauses).map(([k, v]) => (
                <li
                  key={k}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-2"
                >
                  <span className="font-mono text-xs text-[var(--accent)]">
                    {k}
                  </span>
                  <p className="text-[var(--ink-soft)]">{v}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
    </section>
  );

  const paymentsPanel = (
    <section className="space-y-5">
      <div className="ios-group p-4">
        <LandPaymentForm
          lands={[lot.asset]}
          defaultLandId={lot.asset.id}
          defaultFx={String(fx)}
        />
      </div>
      <ul className="ios-group">
        {lot.payments.length === 0 && (
          <li className="px-4 py-6 text-sm text-[var(--muted)]">
            No payments
          </li>
        )}
        {lot.payments.map((p) => (
          <li
            key={p.id}
            className="ios-row"
          >
            <div>
              <p className="ios-headline">
                {CONCEPT_LABELS[p.concept] ?? p.concept}
                {p.installmentNumber != null
                  ? ` #${p.installmentNumber}`
                  : ""}
              </p>
              <p className="text-[13px] text-[var(--muted)]">
                {formatDate(p.date)} · {p.paymentMethod}
                {p.receiptPath ? (
                  <>
                    {" · "}
                    <a
                      href={`/api/receipts/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[var(--accent)]"
                    >
                      {p.receiptName ?? "Receipt"}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
            <div className="text-right">
              <p className="money text-[17px] font-semibold">
                {formatMoney(p.amountLocal, p.localCurrency)}
              </p>
              {(p.discountLocal ?? 0) > 0 && (
                <p className="text-[12px] text-[var(--warn)]">
                  Disc. {formatMoney(p.discountLocal, p.localCurrency)}
                </p>
              )}
              <p className="text-[13px] text-[var(--muted)]">
                {formatMoney(p.amountUsd, "USD")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  const schedulePanel = (
    <section className="space-y-3">
      {overdue.length > 0 && (
        <p className="text-sm text-[var(--danger)]">
          {overdue.length} overdue
        </p>
      )}
      <ul className="ios-group">
        {[...overdue, ...upcoming.slice(0, 8)].map((item) => (
          <li
            key={`${item.concept}-${item.installmentNumber ?? item.dueDate}`}
            className="ios-row"
          >
            <div>
              <p className="ios-headline">{item.label}</p>
              <p className="text-[13px] text-[var(--muted)]">
                {formatDate(item.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="money text-[17px] font-semibold">
                {formatMoney(item.amountLocal, "BOB")}
              </p>
              <StatusPill status={item.status} />
            </div>
          </li>
        ))}
        {overdue.length === 0 && upcoming.length === 0 && (
          <li className="px-4 py-6 text-[15px] text-[var(--muted)]">
            No upcoming installments
          </li>
        )}
      </ul>
    </section>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/land" className="ios-back">
          ‹ Lots
        </Link>
        <h1 className="ios-large-title">{lot.asset.ticker}</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">{lot.asset.name}</p>
      </div>

      <LandTabs
        defaultTab={defaultTab}
        panels={{
          status: statusPanel,
          contract: contractPanel,
          payments: paymentsPanel,
          schedule: schedulePanel,
        }}
      />
    </div>
  );
}

function Stat({
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

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="text-[var(--ink-soft)]">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "paid"
      ? "text-[var(--positive)]"
      : status === "overdue"
        ? "text-[var(--danger)]"
        : status === "due"
          ? "text-[var(--warn)]"
          : "text-[var(--muted)]";
  const label =
    status === "paid"
      ? "Paid"
      : status === "overdue"
        ? "Overdue"
        : status === "due"
          ? "Due"
          : "Next";
  return (
    <p className={`text-[11px] font-semibold ${color}`}>{label}</p>
  );
}
