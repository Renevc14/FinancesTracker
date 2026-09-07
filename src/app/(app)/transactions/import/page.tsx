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
          ← Activity
        </Link>
        <h1 className="ios-large-title mt-2">Import</h1>
      </div>

      <ul className="ios-group">
        {sources.map((s) => (
          <li key={s.id} className="ios-row">
            <div>
              <p className="ios-headline">{s.label}</p>
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
    </div>
  );
}
