import type { AssetClass, LandStatus, TransactionType } from "@/lib/db/schema";

export const CLASS_LABELS: Record<AssetClass, string> = {
  crypto: "Cripto",
  stock: "Acciones",
  stable: "Estables",
  land: "Terrenos",
  cash: "Cash",
};

export const TX_TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Compra",
  sell: "Venta",
  transfer_in: "Entrada",
  transfer_out: "Salida",
  reward: "Earn",
  dividend: "Dividendo",
  fee: "Fee",
  tax: "Impuesto",
  adjustment: "Ajuste",
};

export const LAND_STATUS_LABELS: Record<LandStatus, string> = {
  reserved: "Reservado",
  signed: "Firmado",
  paying: "En cuotas",
  delivered: "Entregado",
  cancelled: "Cancelado",
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
