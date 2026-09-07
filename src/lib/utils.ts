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

export function formatQuantity(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 1 ? 4 : 8;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function localISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function parseDisplayDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  return new Date(`${date.slice(0, 10)}T12:00:00`);
}

export function formatDate(date: string | Date): string {
  const d = parseDisplayDate(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT[d.getMonth()] ?? "Jan";
  return `${day} ${month} ${d.getFullYear()}`;
}

export function formatMonthYear(date: string): string {
  const d = parseDisplayDate(date);
  const month = MONTHS_LONG[d.getMonth()] ?? "January";
  return `${month} ${d.getFullYear()}`;
}
