"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setThemeAction } from "@/lib/actions";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ current }: { current: Theme }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dark = current === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Modo noche"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setThemeAction(dark ? "light" : "dark");
          router.refresh();
        })
      }
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors",
        dark ? "bg-[var(--positive)]" : "bg-[var(--surface-3)]",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.28)] transition-[left]",
          dark ? "left-[22px]" : "left-[2px]",
        )}
      />
    </button>
  );
}
