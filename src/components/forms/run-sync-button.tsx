"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runManualSyncAction } from "@/lib/actions";

export function RunSyncButton({ credentialId }: { credentialId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await runManualSyncAction(credentialId);
          router.refresh();
        })
      }
    >
      {pending ? "Sync…" : "Sync ahora"}
    </Button>
  );
}
