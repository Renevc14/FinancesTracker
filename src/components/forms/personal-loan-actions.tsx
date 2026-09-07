"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  deletePersonalLoanAction,
  markPersonalLoanRepaidAction,
  reopenPersonalLoanAction,
} from "@/lib/actions";
import type { PersonalLoanStatus } from "@/lib/db/schema";

export function PersonalLoanActions({
  id,
  status,
}: {
  id: string;
  status: PersonalLoanStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {status === "open" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await markPersonalLoanRepaidAction(id);
              router.refresh();
            })
          }
        >
          Repaid
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await reopenPersonalLoanAction(id);
              router.refresh();
            })
          }
        >
          Reopen
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-[var(--danger)]"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deletePersonalLoanAction(id);
            router.refresh();
          })
        }
      >
        Delete
      </Button>
    </div>
  );
}
