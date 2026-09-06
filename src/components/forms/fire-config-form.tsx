"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveFireConfigAction } from "@/lib/actions";

export function FireConfigForm({
  target,
  monthly,
  expectedReturn,
  targetDate,
}: {
  target: number;
  monthly: number;
  expectedReturn: number;
  targetDate: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await saveFireConfigAction(fd);
          router.refresh();
        });
      }}
    >
      <Label htmlFor="fireTargetAmount">Meta USD</Label>
      <Input
        id="fireTargetAmount"
        name="fireTargetAmount"
        type="number"
        defaultValue={target}
        required
      />
      <Label htmlFor="fireExpectedContribution">Aporte mensual USD</Label>
      <Input
        id="fireExpectedContribution"
        name="fireExpectedContribution"
        type="number"
        defaultValue={monthly}
      />
      <Label htmlFor="fireExpectedReturn">Retorno anual (0.07 = 7%)</Label>
      <Input
        id="fireExpectedReturn"
        name="fireExpectedReturn"
        type="number"
        step="0.001"
        defaultValue={expectedReturn}
      />
      <Label htmlFor="fireTargetDate">Fecha meta</Label>
      <Input
        id="fireTargetDate"
        name="fireTargetDate"
        type="date"
        defaultValue={targetDate ?? ""}
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar proyección"}
      </Button>
    </form>
  );
}
