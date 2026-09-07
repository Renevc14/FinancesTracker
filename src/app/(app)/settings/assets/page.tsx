import Link from "next/link";
import { listAssets } from "@/lib/services/snapshot";
import { classLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AssetsSettingsPage() {
  const assets = await listAssets();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="ios-back">
          ‹ Settings
        </Link>
        <h1 className="mt-2 ios-large-title">Assets</h1>
      </div>

      <ul className="ios-group">
        {assets.map((a) => (
          <li key={a.id} className="ios-row">
            <div>
              <p className="ios-headline">{a.ticker}</p>
              <p className="text-[13px] text-[var(--muted)]">{a.name}</p>
            </div>
            <span className="text-[13px] text-[var(--muted)]">
              {classLabel(a.class)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
