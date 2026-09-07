import type { AssetClass, LandStatus, TransactionType } from "@/lib/db/schema";

export const CLASS_LABELS: Record<AssetClass, string> = {
  crypto: "Crypto",
  stock: "Stocks",
  stable: "Stables",
  land: "Lots",
  cash: "Cash",
};

export const TX_TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Buy",
  sell: "Sell",
  transfer_in: "In",
  transfer_out: "Out",
  reward: "Earn",
  dividend: "Dividend",
  fee: "Fee",
  tax: "Tax",
  adjustment: "Adjust",
};

export const LAND_STATUS_LABELS: Record<LandStatus, string> = {
  reserved: "Reserved",
  signed: "Signed",
  paying: "Paying",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function classLabel(value: string): string {
  return CLASS_LABELS[value as AssetClass] ?? value;
}

export function txTypeLabel(value: string): string {
  return TX_TYPE_LABELS[value as TransactionType] ?? value;
}

export function landStatusLabel(value: string): string {
  return LAND_STATUS_LABELS[value as LandStatus] ?? value;
}
