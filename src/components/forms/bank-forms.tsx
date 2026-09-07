"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { addBankBalanceAction, createBankAccountAction } from "@/lib/actions";

export function BankAccountForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createBankAccountAction(fd);
          router.refresh();
          e.currentTarget.reset();
        });
      }}
    >
      <Label htmlFor="name">Name</Label>
      <Input id="name" name="name" required placeholder="Checking" />
      <Label htmlFor="bank">Bank</Label>
      <Input id="bank" name="bank" required placeholder="Banco Unión" />
      <Label htmlFor="currency">Currency</Label>
      <Select id="currency" name="currency" defaultValue="BOB">
        <option value="BOB">BOB</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </Select>
      <Label htmlFor="accountType">Type</Label>
      <Select id="accountType" name="accountType" defaultValue="checking">
        <option value="checking">Checking</option>
        <option value="savings">Savings</option>
      </Select>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Add"}
      </Button>
    </form>
  );
}

export function BankBalanceForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("accountId", accountId);
        start(async () => {
          await addBankBalanceAction(fd);
          router.refresh();
          e.currentTarget.reset();
        });
      }}
    >
      <Input
        name="balanceLocal"
        type="number"
        step="0.01"
        required
        placeholder="Balance"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "OK"}
      </Button>
    </form>
  );
}
