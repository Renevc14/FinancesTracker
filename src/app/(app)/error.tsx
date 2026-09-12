"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="ios-title">Something went wrong</p>
      {error.message ? (
        <p className="max-w-sm text-[13px] leading-snug text-[var(--muted)]">
          {error.message}
        </p>
      ) : null}
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
