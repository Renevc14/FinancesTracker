"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshMarketsAction } from "@/lib/actions";

export function RefreshMarketsButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="-ml-2 h-8 px-2 text-[15px] font-medium"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await refreshMarketsAction();
          router.refresh();
        })
      }
    >
      {pending ? "Actualizando…" : "Precios en vivo"}
    </Button>
  );
}
