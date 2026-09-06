import { ChevronRight } from "lucide-react";

export function Chevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      size={16}
      strokeWidth={2.5}
      aria-hidden
      className={className ?? "shrink-0 text-[var(--muted-2)]"}
    />
  );
}
