"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runManualSyncAction } from "@/lib/actions";

export function RunSyncButton({ credentialId }: { credentialId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await runManualSyncAction(credentialId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {pending ? "Importando…" : "Sync ahora"}
      </Button>
      {error ? (
        <p className="max-w-[180px] text-right text-[12px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
