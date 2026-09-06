"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { captureSnapshotAction } from "@/lib/actions";

export function CaptureSnapshotButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      disabled={pending}
      size="sm"
      className="rounded-full"
      onClick={() =>
        start(async () => {
          await captureSnapshotAction();
          router.refresh();
        })
      }
    >
      {pending ? "Capturando…" : "Capturar"}
    </Button>
  );
}
