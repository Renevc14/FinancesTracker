"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveDriftAction } from "@/lib/actions";

export function IgnoreDriftButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await resolveDriftAction(logId, "ignored");
            router.refresh();
          })
        }
      >
        {pending ? "…" : "Ignorar"}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await resolveDriftAction(logId, "accepted_api");
            router.refresh();
          })
        }
      >
        {pending ? "…" : "Aceptar API"}
      </Button>
    </div>
  );
}
