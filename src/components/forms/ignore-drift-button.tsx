"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveDriftAction } from "@/lib/actions";

export function IgnoreDriftButton({ logId }: { logId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => start(() => resolveDriftAction(logId, "ignored"))}
    >
      {pending ? "…" : "Ignorar"}
    </Button>
  );
}
