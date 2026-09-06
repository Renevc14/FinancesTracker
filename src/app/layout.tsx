import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { parseTheme, THEME_COOKIE, type Theme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patrimonio",
  description: "Tracker patrimonial multi-moneda — cripto, acciones y terrenos",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Patrimonio",
  },
};

async function resolveTheme(): Promise<Theme> {
  const fromCookie = (await cookies()).get(THEME_COOKIE)?.value;
  if (fromCookie === "dark" || fromCookie === "light") return fromCookie;
  try {
    const config = await db.query.userConfig.findFirst();
    return parseTheme(config?.theme);
  } catch {
    return "light";
  }
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await resolveTheme();
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
    themeColor: theme === "dark" ? "#000000" : "#f2f2f7",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await resolveTheme();
  return (
    <html
      lang="es"
      className="h-full antialiased"
      data-theme={theme}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
