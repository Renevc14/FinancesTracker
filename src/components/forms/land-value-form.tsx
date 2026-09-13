"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateLandMarketValueAction } from "@/lib/actions";
import { formatMoney } from "@/lib/utils";

export function LandValueForm({
  landAssetId,
  surfaceM2,
  contractPricePerM2Local,
  defaultPricePerM2Local,
  fxRate,
}: {
  landAssetId: string;
  surfaceM2: number;
  contractPricePerM2Local: number;
  defaultPricePerM2Local: number;
  fxRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(
    defaultPricePerM2Local > 0 ? String(roundM2(defaultPricePerM2Local)) : "",
  );

  const nowPerM2 = Number(price) || 0;
  const nowLocal = nowPerM2 * surfaceM2;
  const nowUsd = fxRate > 0 ? nowLocal / fxRate : 0;
  const contractLocal = contractPricePerM2Local * surfaceM2;
  const deltaLocal = nowLocal - contractLocal;
  const deltaPct =
    contractLocal > 0 ? (deltaLocal / contractLocal) * 100 : 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await updateLandMarketValueAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="landAssetId" value={landAssetId} />
      <input type="hidden" name="fxRate" value={String(fxRate)} />

      <div className="space-y-2">
        <Label htmlFor="pricePerM2Local">Now Bs/m²</Label>
        <Input
          id="pricePerM2Local"
          name="pricePerM2Local"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <p className="text-[13px] text-[var(--muted)]">
          Contract frozen at {formatMoney(contractPricePerM2Local, "BOB")}/m²
        </p>
      </div>

      {nowPerM2 > 0 && (
        <div className="space-y-1 text-[13px] text-[var(--ink-soft)]">
          <p>
            Lot now {formatMoney(nowLocal, "BOB")} · {formatMoney(nowUsd, "USD")}
          </p>
          <p
            className={
              deltaLocal >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }
          >
            {deltaLocal >= 0 ? "+" : "−"}
            {formatMoney(Math.abs(deltaLocal), "BOB")} vs contract
            {contractLocal > 0 ? ` (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)` : ""}
          </p>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save lot value"}
      </Button>
    </form>
  );
}

function roundM2(n: number): number {
  return Math.round(n * 100) / 100;
}
