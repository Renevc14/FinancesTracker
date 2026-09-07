"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveMonthlySalaryAction } from "@/lib/actions";

export function SalaryConfigForm({ amount }: { amount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await saveMonthlySalaryAction(fd);
          router.refresh();
        });
      }}
    >
      <Label htmlFor="monthlySalaryUsd">Monthly USD</Label>
      <Input
        id="monthlySalaryUsd"
        name="monthlySalaryUsd"
        type="number"
        step="0.01"
        min="0"
        defaultValue={amount}
        required
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
