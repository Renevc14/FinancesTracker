"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createLandPaymentAction } from "@/lib/actions";
import type { Asset } from "@/lib/db/schema";
import { landConcepts } from "@/lib/db/schema";

const CONCEPT_LABELS: Record<string, string> = {
  reservation: "Reserva",
  initial: "Inicial",
  installment: "Cuota",
  balloon: "Globo",
  tax: "IT / Impuesto",
  notary: "Formalización",
  other: "Otro",
};

export function LandPaymentForm({
  lands,
  defaultLandId,
}: {
  lands: Asset[];
  defaultLandId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState("installment");
  const [amount, setAmount] = useState("");
  const [fx, setFx] = useState("12");

  const amountLocal = Number(amount) || 0;
  const fxRate = Number(fx) || 1;
  const amountUsd = fxRate > 0 ? amountLocal / fxRate : 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const landAssetId = String(fd.get("landAssetId"));
        start(async () => {
          const result = await createLandPaymentAction({
            date: fd.get("date"),
            landAssetId,
            concept: fd.get("concept"),
            installmentNumber: fd.get("installmentNumber") || null,
            amountLocal: fd.get("amountLocal"),
            localCurrency: fd.get("localCurrency") || "BOB",
            fxRate: fd.get("fxRate"),
            paymentMethod: fd.get("paymentMethod"),
            receiptNumber: fd.get("receiptNumber") || undefined,
            notes: fd.get("notes") || undefined,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/land/${landAssetId}`);
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="landAssetId">Lote</Label>
        <Select
          id="landAssetId"
          name="landAssetId"
          required
          defaultValue={defaultLandId ?? ""}
        >
          <option value="" disabled>
            Seleccionar…
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
          <Label htmlFor="concept">Concepto</Label>
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
          <Label htmlFor="date">Fecha</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      {concept === "installment" && (
        <div className="space-y-2">
          <Label htmlFor="installmentNumber">Número de cuota</Label>
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
          <Label htmlFor="amountLocal">Monto local</Label>
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
          <Label htmlFor="localCurrency">Moneda</Label>
          <Select id="localCurrency" name="localCurrency" defaultValue="BOB">
            <option value="BOB">BOB</option>
            <option value="USD">USD</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fxRate">FX del día (Bs por USD)</Label>
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

      <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
        Equivalente USD:{" "}
        <span className="font-mono font-semibold">
          ${amountUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Método</Label>
        <Select id="paymentMethod" name="paymentMethod" defaultValue="Transferencia BNB">
          <option>Efectivo</option>
          <option>Transferencia BNB</option>
          <option>USDT/P2P</option>
          <option>Cheque</option>
          <option>Otro</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="receiptNumber">Comprobante N°</Label>
        <Input id="receiptNumber" name="receiptNumber" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Registrar pago"}
      </Button>
    </form>
  );
}
