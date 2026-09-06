"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { saveApiCredentialAction } from "@/lib/actions";

export function CredentialForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("binance");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await saveApiCredentialAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/settings/credentials");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="binance">Binance (read-only)</option>
          <option value="ibkr_flex">IBKR Flex</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="label">Nombre</Label>
        <Input id="label" name="label" required placeholder="Binance Personal" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">
          {provider === "ibkr_flex" ? "Query ID" : "API Key"}
        </Label>
        <Input id="apiKey" name="apiKey" required autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiSecret">
          {provider === "ibkr_flex" ? "Flex Token" : "API Secret"}
        </Label>
        <Input id="apiSecret" name="apiSecret" type="password" required autoComplete="off" />
      </div>
      {provider === "ibkr_flex" && (
        <div className="space-y-2">
          <Label htmlFor="flexQueryId">Query ID (si va aparte)</Label>
          <Input id="flexQueryId" name="flexQueryId" />
        </div>
      )}
      <p className="text-[13px] text-[var(--muted)]">
        Solo permisos de lectura. Se guarda cifrado con AUTH_SECRET.
      </p>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar credencial"}
      </Button>
    </form>
  );
}
