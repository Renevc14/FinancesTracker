import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import type { DisplayCurrency } from "@/lib/db/schema";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let displayCurrency: DisplayCurrency = "USD";
  try {
    const config = await db.query.userConfig.findFirst();
    displayCurrency = config?.displayCurrency ?? "USD";
  } catch (err) {
    console.error("[app-layout] userConfig", err);
  }
  return (
    <AppShell displayCurrency={displayCurrency}>
      {children}
    </AppShell>
  );
}
