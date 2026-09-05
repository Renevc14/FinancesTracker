import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(
  amount: number,
  currency: string = "USD",
  opts?: { compact?: boolean },
): string {
  const abs = Math.abs(amount);
  if (opts?.compact && abs >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "BOB" ? "USD" : currency,
      notation: "compact",
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace("$", currency === "BOB" ? "Bs " : currency === "EUR" ? "€" : "$");
  }

  if (currency === "BOB") {
    return `Bs ${amount.toLocaleString("es-BO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return new Intl.NumberFormat(currency === "EUR" ? "es-ES" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  return d.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
