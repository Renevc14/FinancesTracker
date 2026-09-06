"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AssetLogo } from "@/components/ui/asset-logo";
import type { HoldingRow } from "@/lib/services/portfolio";
import { cn, formatMoney, formatPct, formatQuantity } from "@/lib/utils";

export function HoldingsList({
  holdings,
  currency,
  fx,
}: {
  holdings: HoldingRow[];
  currency: string;
  fx: number;
}) {
  const money = (usd: number) => formatMoney(usd * fx, currency);
  const rows = holdings
    .slice()
    .sort((a, b) => b.marketValueUsd - a.marketValueUsd);

  return (
    <ul className="ios-group">
      {rows.map((h) => (
        <HoldingItem key={h.assetId} holding={h} money={money} />
      ))}
    </ul>
  );
}

function HoldingItem({
  holding,
  money,
}: {
  holding: HoldingRow;
  money: (usd: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const expandable = holding.wallets.length > 0;
  const staticNote =
    holding.class === "land"
      ? "al costo"
      : holding.class === "cash"
        ? "saldo"
        : null;
  const avgCost =
    holding.quantity > 0 && holding.investedUsd > 0
      ? holding.investedUsd / holding.quantity
      : null;
  const fiat =
    holding.priceUsd != null
      ? holding.displayQuantity * holding.priceUsd
      : holding.marketValueUsd;

  const isQtyAsset =
    holding.class === "crypto" ||
    holding.class === "stable" ||
    holding.class === "stock";

  const row = (
    <div className="ios-row">
      <div className="flex min-w-0 items-center gap-3">
        <AssetLogo ticker={holding.ticker} assetClass={holding.class} />
        <div className="min-w-0">
          <p className="ios-headline leading-tight">{holding.ticker}</p>
          <p className="truncate text-[13px] text-[var(--muted)]">
            {holding.name}
            {isQtyAsset && holding.priceUsd != null
              ? ` · ${formatMoney(holding.priceUsd, "USD")}`
              : holding.class === "land"
                ? ` · ${formatQuantity(holding.quantity)} m²`
                : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="text-right">
          {isQtyAsset ? (
            <>
              <p className="money text-[15px] font-semibold tabular-nums">
                {formatQuantity(holding.displayQuantity)}
              </p>
              <p className="money text-[13px] text-[var(--muted)]">
                {money(fiat)}
              </p>
              <p
                className={cn(
                  "text-[13px] tabular-nums",
                  holding.pnlUsd >= 0
                    ? "text-[var(--positive)]"
                    : "text-[var(--negative)]",
                )}
              >
                {holding.pnlUsd >= 0 ? "+ " : "− "}
                {money(Math.abs(holding.pnlUsd))}
              </p>
            </>
          ) : (
            <>
              <p className="money text-[17px] font-semibold">{money(fiat)}</p>
              <p className="text-[13px] text-[var(--muted)]">{staticNote}</p>
            </>
          )}
        </div>
        {expandable ? (
          <ChevronDown
            size={18}
            strokeWidth={2}
            className={cn(
              "text-[var(--muted-2)] transition-transform",
              open && "rotate-180",
            )}
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <li className="border-[var(--separator)] [&:not(:first-child)]:border-t">
      {expandable ? (
        <button
          type="button"
          className="ios-pressable w-full text-left"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {row}
        </button>
      ) : (
        row
      )}
      {expandable && open ? (
        <ul className="border-t border-[var(--separator)] bg-[var(--surface-2)] px-4 py-1">
          {holding.wallets.map((w) => (
            <li
              key={w.key}
              className="flex min-h-11 items-center justify-between gap-3"
            >
              <div>
                <p className="text-[15px]">{w.label}</p>
                {w.hint ? (
                  <p className="text-[12px] text-[var(--muted)]">{w.hint}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="money text-[15px] tabular-nums">
                  {formatQuantity(w.quantity)}
                </p>
                {holding.priceUsd != null ? (
                  <p className="money text-[12px] text-[var(--muted)]">
                    {money(w.quantity * holding.priceUsd)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
          {avgCost != null ? (
            <li className="flex min-h-10 items-center justify-between gap-3 text-[13px] text-[var(--muted)]">
              <span>Precio medio</span>
              <span className="money">{formatMoney(avgCost, "USD")}</span>
            </li>
          ) : null}
          <li className="flex min-h-10 items-center justify-between gap-3 text-[13px] text-[var(--muted)]">
            <span>Rendimiento</span>
            <span
              className={cn(
                "tabular-nums",
                holding.pnlPct >= 0
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]",
              )}
            >
              {formatPct(holding.pnlPct)}
            </span>
          </li>
        </ul>
      ) : null}
    </li>
  );
}
