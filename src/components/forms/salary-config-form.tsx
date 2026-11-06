"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { saveMonthlySalaryAction } from "@/lib/actions";

export function SalaryConfigForm({
  amount,
  fromMonth,
  months,
}: {
  amount: number;
  fromMonth: string;
  months: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const result = await saveMonthlySalaryAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="fromMonth">Applies from</Label>
        <Select id="fromMonth" name="fromMonth" defaultValue={fromMonth} required>
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </Select>
        <p className="text-[13px] text-[var(--muted)]">
          Earlier months keep the salary they already have.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
