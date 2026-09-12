"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createPersonalLoanAction } from "@/lib/actions";
import { localISODate } from "@/lib/utils";

export function PersonalLoanForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(localISODate);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await createPersonalLoanAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/loans");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="counterparty">To</Label>
        <Input
          id="counterparty"
          name="counterparty"
          required
          placeholder="Name"
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="any"
            min="0"
            required
            inputMode="decimal"
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" name="currency" defaultValue="BOB">
            <option value="BOB">BOB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
        </div>
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

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {error && <p className="text-[15px] text-[var(--danger)]">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
