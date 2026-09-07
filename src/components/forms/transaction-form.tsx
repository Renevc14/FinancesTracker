"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createTransactionAction } from "@/lib/actions";
import type { Asset } from "@/lib/db/schema";
import { transactionTypes } from "@/lib/db/schema";
import { TX_TYPE_LABELS } from "@/lib/labels";
import { formatMoney, localISODate } from "@/lib/utils";

export function TransactionForm({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [fx, setFx] = useState("1");
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(localISODate());
  }, []);

  const quantity = Number(qty) || 0;
  const unitPrice = Number(price) || 0;
  const fxRate = Number(fx) || 1;
  const totalUsd =
    currency === "USD" ? quantity * unitPrice : (quantity * unitPrice) / fxRate;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await createTransactionAction({
            date: fd.get("date"),
            assetId: fd.get("assetId"),
            type: fd.get("type"),
            quantity: fd.get("quantity"),
            unitPrice: fd.get("unitPrice"),
            priceCurrency: fd.get("priceCurrency"),
            fxRate: fd.get("fxRate") || 1,
            platform: fd.get("platform"),
            notes: fd.get("notes") || undefined,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/transactions");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="assetId">Asset</Label>
        <Select id="assetId" name="assetId" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {assets
            .filter((a) => a.class !== "land")
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.ticker} — {a.name}
              </option>
            ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue="buy">
            {transactionTypes.map((t) => (
              <option key={t} value={t}>
                {TX_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">Qty</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            required
            inputMode="decimal"
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Price</Label>
          <Input
            id="unitPrice"
            name="unitPrice"
            type="number"
            step="any"
            required
            inputMode="decimal"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>

      <div className={currency === "USD" ? "space-y-2" : "grid grid-cols-2 gap-3"}>
        <div className="space-y-2">
          <Label htmlFor="priceCurrency">Currency</Label>
          <Select
            id="priceCurrency"
            name="priceCurrency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="BOB">BOB</option>
            <option value="USDC">USDC</option>
          </Select>
        </div>
        {currency !== "USD" && (
          <div className="space-y-2">
            <Label htmlFor="fxRate">FX → USD</Label>
            <Input
              id="fxRate"
              name="fxRate"
              type="number"
              step="any"
              required
              inputMode="decimal"
              value={fx}
              onChange={(e) => setFx(e.target.value)}
            />
          </div>
        )}
        {currency === "USD" && (
          <input type="hidden" name="fxRate" value="1" />
        )}
      </div>

      <div className="rounded-[var(--radius)] bg-[var(--surface-2)] px-3 py-2 text-[15px]">
        Total{" "}
        <span className="money font-semibold">{formatMoney(totalUsd, "USD")}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform">Venue</Label>
        <Select id="platform" name="platform" defaultValue="Binance">
          <option>Binance</option>
          <option>IBKR</option>
          <option>Meru</option>
          <option>Manual</option>
          <option>Other</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
