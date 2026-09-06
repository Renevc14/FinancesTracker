import Link from "next/link";
import { listImportSources } from "@/lib/imports";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const sources = listImportSources();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/transactions"
          className="text-[15px] font-medium text-[var(--accent)]"
        >
          ← Movimientos
        </Link>
        <h1 className="ios-large-title mt-2">Importar</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          CSV es el fallback. Para BTC, ETH y SOL, el sync de Binance sustituye
          las compras y ventas Spot de esos pares.
        </p>
      </div>

      <ul className="ios-group">
        {sources.map((s) => (
          <li key={s.id} className="ios-row">
            <div>
              <p className="ios-headline">{s.label}</p>
              <p className="text-[13px] text-[var(--muted)]">
                {s.ready
                  ? "Parser listo (preview + dedupe)"
                  : "Contrato tipado · parser pendiente"}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                s.ready
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--surface-3)] text-[var(--muted)]"
              }`}
            >
              {s.ready ? "Ready" : "Soon"}
            </span>
          </li>
        ))}
      </ul>

      <div className="ios-group space-y-2 p-4 text-[15px] text-[var(--ink-soft)]">
        <p className="ios-headline text-[var(--ink)]">Cómo funciona</p>
        <p>
          1. Exportá CSV desde Binance (Spot Trade History) o IBKR Flex Query.
        </p>
        <p>
          2. El preview valida filas, calcula FX y detecta duplicados por{" "}
          <span className="font-mono text-[13px]">import_ref</span>.
        </p>
        <p>3. Confirmás el import — re-ejecutar el mismo CSV no duplica.</p>
        <p className="text-[13px] text-[var(--muted)]">
          API keys: se guardan cifradas en Ajustes. Tras un sync de Binance con
          fills Spot, las compras/ventas locales de esas criptos se archivan.
          CSV sigue siendo el fallback si la API no trae historial.
        </p>
      </div>
    </div>
  );
}
