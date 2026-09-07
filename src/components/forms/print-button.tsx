"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      className="text-[15px] font-medium text-[var(--accent)]"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
