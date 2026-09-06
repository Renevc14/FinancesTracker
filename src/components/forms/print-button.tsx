"use client";

export function PrintButton({ label = "Exportar / imprimir" }: { label?: string }) {
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
