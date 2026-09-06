import Link from "next/link";
import { notFound } from "next/navigation";
import { LandPaymentForm } from "@/components/forms/land-payment-form";
import { LandTabs, type LandTabId } from "@/components/land/land-tabs";
import { Progress } from "@/components/ui/progress";
import { getLatestFxRate } from "@/lib/services/fx";
import { getLandLot } from "@/lib/services/land";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONCEPT_LABELS: Record<string, string> = {
  reservation: "Reserva",
  initial: "Inicial",
  installment: "Cuota",
  balloon: "Globo",
  tax: "IT",
  notary: "Formalización",
  other: "Otro",
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

  const statusPanel = (
    <section className="space-y-3">
      <Progress value={lot.paidPct} />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat
          label="Precio contrato"
          value={formatMoney(lot.contract.priceLocal, "BOB")}
        />
        <Stat label="Pagado" value={formatMoney(lot.paidLocal, "BOB")} />
        <Stat label="Pagado USD" value={formatMoney(lot.paidUsd, "USD")} />
        <Stat label="Saldo" value={formatMoney(lot.remainingLocal, "BOB")} />
      </div>
      <Link
        href={`/pagos/nuevo?lote=${lot.asset.id}`}
        className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-[15px] font-semibold text-[var(--accent-fg)]"
      >
        Nuevo pago
      </Link>
    </section>
  );

  const contractPanel = (
    <section className="space-y-3">
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Item label="Vendedor" value={lot.contract.seller} />
        <Item label="Developer" value={lot.contract.developer ?? "—"} />
        <Item label="Ubicación" value={lot.contract.location} />
        <Item label="Matrícula" value={lot.contract.matricula} />
        <Item label="Superficie" value={`${lot.contract.surfaceM2} m²`} />
        <Item label="Firma" value={formatDate(lot.contract.signingDate)} />
        <Item
          label="Plan"
          value={lot.contract.paymentPlan.code ?? "cuotas + globo"}
        />
      </dl>
      {lot.contract.contractClauses &&
        Object.keys(lot.contract.contractClauses).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Cláusulas clave
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
            Sin pagos registrados
          </li>
        )}
        {lot.payments.map((p) => (
          <li
            key={p.id}
            className="flex justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {CONCEPT_LABELS[p.concept] ?? p.concept}
                {p.installmentNumber != null
                  ? ` #${p.installmentNumber}`
                  : ""}
              </p>
              <p className="text-xs text-[var(--muted)]">
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
                      {p.receiptName ?? "Comprobante"}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
            <div className="text-right">
              <p className="money text-[15px] font-semibold">
                {formatMoney(p.amountLocal, p.localCurrency)}
              </p>
              {(p.discountLocal ?? 0) > 0 && (
                <p className="text-[12px] text-[var(--warn)]">
                  Desc. {formatMoney(p.discountLocal, p.localCurrency)}
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
          {overdue.length} pago(s) en mora
        </p>
      )}
      <ul className="space-y-2">
        {[...overdue, ...upcoming.slice(0, 8)].map((item) => (
          <li
            key={`${item.concept}-${item.installmentNumber ?? item.dueDate}`}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-[var(--muted)]">
                {formatDate(item.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="money text-[15px] font-semibold">
                {formatMoney(item.amountLocal, "BOB")}
              </p>
              <StatusPill status={item.status} />
            </div>
          </li>
        ))}
        {overdue.length === 0 && upcoming.length === 0 && (
          <li className="text-sm text-[var(--muted)]">
            Sin cuotas pendientes en el cronograma
          </li>
        )}
      </ul>
    </section>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/land"
          className="text-[13px] font-medium text-[var(--accent)]"
        >
          ← Terrenos
        </Link>
        <h1 className="mt-2 ios-large-title">
          {lot.asset.ticker}
        </h1>
        <p className="text-[15px] text-[var(--muted)]">{lot.asset.name}</p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="money text-sm font-semibold">{value}</p>
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
      ? "Pagado"
      : status === "overdue"
        ? "Mora"
        : status === "due"
          ? "Hoy"
          : "Próximo";
  return (
    <p className={`text-[11px] font-semibold ${color}`}>{label}</p>
  );
}
