"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createLandPaymentAction } from "@/lib/actions";
import type { Asset } from "@/lib/db/schema";
import { landConcepts } from "@/lib/db/schema";
import { formatMoney, localISODate } from "@/lib/utils";

const CONCEPT_LABELS: Record<string, string> = {
  reservation: "Reservation",
  initial: "Down payment",
  installment: "Installment",
  balloon: "Balloon",
  tax: "IT",
  notary: "Notary",
  other: "Other",
};

export function LandPaymentForm({
  lands,
  defaultLandId,
  defaultFx = "12.3",
}: {
  lands: Asset[];
  defaultLandId?: string;
  defaultFx?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState("installment");
  const [amount, setAmount] = useState("");
  const [fx, setFx] = useState(defaultFx);
  const [withDiscount, setWithDiscount] = useState(false);
  const [discount, setDiscount] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(localISODate());
  }, []);

  const amountLocal = Number(amount) || 0;
  const discountLocal = withDiscount ? Number(discount) || 0 : 0;
  const fxRate = Number(fx) || 1;
  const amountUsd = fxRate > 0 ? amountLocal / fxRate : 0;
  const credited = amountLocal + discountLocal;
  const currency = "BOB";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        if (!withDiscount) fd.set("discountLocal", "0");
        const landAssetId = String(fd.get("landAssetId"));
        start(async () => {
          const result = await createLandPaymentAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          form.reset();
          setAmount("");
          setWithDiscount(false);
          setDiscount("");
          setFileName(null);
          setConcept("installment");
          setDate(localISODate());
          setError(null);
          router.push(`/land/${landAssetId}?tab=payments`);
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="landAssetId">Lot</Label>
        <Select
          id="landAssetId"
          name="landAssetId"
          required
          defaultValue={defaultLandId ?? ""}
        >
          <option value="" disabled>
            Choose…
          </option>
          {lands.map((l) => (
            <option key={l.id} value={l.id}>
              {l.ticker} — {l.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="concept">Type</Label>
          <Select
            id="concept"
            name="concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          >
            {landConcepts.map((c) => (
              <option key={c} value={c}>
                {CONCEPT_LABELS[c] ?? c}
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

      {concept === "installment" && (
        <div className="space-y-2">
          <Label htmlFor="installmentNumber">#</Label>
          <Input
            id="installmentNumber"
            name="installmentNumber"
            type="number"
            min={1}
            required
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amountLocal">Amount</Label>
          <Input
            id="amountLocal"
            name="amountLocal"
            type="number"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="localCurrency">Currency</Label>
          <Select id="localCurrency" name="localCurrency" defaultValue="BOB">
            <option value="BOB">BOB</option>
            <option value="USD">USD</option>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[15px] text-[var(--ink-soft)]">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={withDiscount}
          onChange={(e) => {
            setWithDiscount(e.target.checked);
            if (!e.target.checked) setDiscount("");
          }}
        />
        Discount
      </label>

      {withDiscount && (
        <div className="space-y-2">
          <Label htmlFor="discountLocal">Discount (Bs)</Label>
          <Input
            id="discountLocal"
            name="discountLocal"
            type="number"
            step="any"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
          />
          <p className="text-[13px] text-[var(--muted)]">
            Credited to the lot. Not cash out.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fxRate">Bs / USD</Label>
        <Input
          id="fxRate"
          name="fxRate"
          type="number"
          step="any"
          required
          value={fx}
          onChange={(e) => setFx(e.target.value)}
        />
      </div>

      <div className="rounded-[var(--radius)] bg-[var(--surface-2)] px-3 py-2 text-[15px]">
        <p>
          Cash out:{" "}
          <span className="money font-semibold">
            {formatMoney(amountUsd, "USD")}
          </span>
        </p>
        {discountLocal > 0 && (
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Lot credit: {formatMoney(credited, currency)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Method</Label>
        <Select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue="Transferencia BNB"
        >
          <option>Efectivo</option>
          <option>Transferencia BNB</option>
          <option>USDT/P2P</option>
          <option>Cheque</option>
          <option>Otro</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="receipt">Receipt</Label>
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*,.pdf,application/pdf"
          className="block w-full text-[15px] text-[var(--ink-soft)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-[var(--accent)]"
          onChange={(e) =>
            setFileName(e.target.files?.[0]?.name ?? null)
          }
        />
        <p className="text-[13px] text-[var(--muted)]">
          Image or PDF, 12 MB max.
          {fileName ? ` · ${fileName}` : ""}
        </p>
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
