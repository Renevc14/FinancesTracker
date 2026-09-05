import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await db.query.userConfig.findFirst();
  return (
    <AppShell displayCurrency={config?.displayCurrency ?? "USD"}>
      {children}
    </AppShell>
  );
}
