import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assets,
  landContracts,
  landPayments,
  type LandContract,
  type LandPayment,
  type LandPaymentPlan,
} from "@/lib/db/schema";
import type { LandPaymentFormValues } from "@/lib/validators";
import { saveReceiptFile, assertReceiptFile } from "@/lib/receipts";

export type LandLotDetail = {
  asset: typeof assets.$inferSelect;
  contract: LandContract;
  payments: LandPayment[];
  paidLocal: number;
  paidUsd: number;
  remainingLocal: number;
  remainingUsd: number;
  paidPct: number;
  schedule: ScheduleItem[];
};

export type ScheduleItem = {
  label: string;
  concept: string;
  dueDate: string;
  amountLocal: number;
  status: "paid" | "due" | "upcoming" | "overdue";
  installmentNumber?: number;
};

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function buildSchedule(
  plan: LandPaymentPlan,
  payments: LandPayment[],
  today = new Date().toISOString().slice(0, 10),
): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  const paidInstallments = new Set(
    payments
      .filter((p) => p.concept === "installment" && p.installmentNumber != null)
      .map((p) => p.installmentNumber as number),
  );
  const hasInitial = payments.some((p) => p.concept === "initial");
  const hasReservation = payments.some((p) => p.concept === "reservation");
  const hasBalloon = payments.some((p) => p.concept === "balloon");

  if (plan.initialDate) {
    items.push({
      label: "Inicial",
      concept: "initial",
      dueDate: plan.initialDate,
      amountLocal:
        plan.installmentAmountLocal * 0 /* placeholder overwritten */,
      status: hasInitial
        ? "paid"
        : plan.initialDate < today
          ? "overdue"
          : plan.initialDate === today
            ? "due"
            : "upcoming",
    });
    // amount from payments or estimate via pct later — keep installment amount as hint
    items[items.length - 1].amountLocal = payments
      .filter((p) => p.concept === "initial")
      .reduce((s, p) => s + p.amountLocal, 0);
  }

  if (hasReservation || plan.initialDate) {
    // reservation tracked separately when present in payments
  }

  const first =
    plan.firstInstallmentDate ??
    (plan.initialDate ? addMonths(plan.initialDate, 1) : undefined);

  if (first) {
    for (let i = 1; i <= plan.installmentsCount; i++) {
      const dueDate = addMonths(first, i - 1);
      const paid = paidInstallments.has(i);
      items.push({
        label: `Cuota ${i}`,
        concept: "installment",
        dueDate,
        amountLocal: plan.installmentAmountLocal,
        installmentNumber: i,
        status: paid
          ? "paid"
          : dueDate < today
            ? "overdue"
            : dueDate === today
              ? "due"
              : "upcoming",
      });
    }
  }

  if (plan.balloonDate || plan.balloonMonthOffset) {
    const balloonDate =
      plan.balloonDate ??
      (first && plan.balloonMonthOffset
        ? addMonths(first, plan.balloonMonthOffset - 1)
        : first
          ? addMonths(first, plan.installmentsCount)
          : today);
    items.push({
      label: "Globo",
      concept: "balloon",
      dueDate: balloonDate,
      amountLocal: plan.balloonAmountLocal,
      status: hasBalloon
        ? "paid"
        : balloonDate < today
          ? "overdue"
          : balloonDate === today
            ? "due"
            : "upcoming",
    });
  }

  return items;
}

export async function listLandLots(): Promise<LandLotDetail[]> {
  const contracts = await db
    .select()
    .from(landContracts)
    .where(isNull(landContracts.deletedAt));

  const details: LandLotDetail[] = [];
  for (const contract of contracts) {
    const asset = await db.query.assets.findFirst({
      where: and(eq(assets.id, contract.landAssetId), isNull(assets.deletedAt)),
    });
    if (!asset) continue;

    const payments = await db
      .select()
      .from(landPayments)
      .where(
        and(
          eq(landPayments.landAssetId, asset.id),
          isNull(landPayments.deletedAt),
        ),
      )
      .orderBy(desc(landPayments.date));

    const paidLocal = payments.reduce(
      (s, p) => s + p.amountLocal + (p.discountLocal ?? 0),
      0,
    );
    const paidUsd = payments.reduce((s, p) => s + p.amountUsd, 0);
    const remainingLocal = Math.max(0, contract.priceLocal - paidLocal);
    const bobPerUsd = payments[0]?.fxRate ?? 12;
    const remainingUsd = remainingLocal / bobPerUsd;
    const paidPct =
      contract.priceLocal > 0 ? (paidLocal / contract.priceLocal) * 100 : 0;

    details.push({
      asset,
      contract,
      payments,
      paidLocal,
      paidUsd,
      remainingLocal,
      remainingUsd,
      paidPct,
      schedule: buildSchedule(contract.paymentPlan, payments),
    });
  }

  return details;
}

export async function getLandLot(assetId: string): Promise<LandLotDetail | null> {
  const lots = await listLandLots();
  return lots.find((l) => l.asset.id === assetId) ?? null;
}

export async function createLandPayment(
  values: LandPaymentFormValues,
  receipt?: File | null,
): Promise<LandPayment> {
  const discountLocal = values.discountLocal ?? 0;
  const amountUsd = values.amountLocal / values.fxRate;
  const [row] = await db
    .insert(landPayments)
    .values({
      date: values.date,
      landAssetId: values.landAssetId,
      concept: values.concept,
      installmentNumber: values.installmentNumber ?? null,
      amountLocal: values.amountLocal,
      localCurrency: values.localCurrency,
      fxRate: values.fxRate,
      amountUsd,
      paymentMethod: values.paymentMethod,
      discountLocal,
      notes: values.notes || null,
    })
    .returning();

  if (!row) throw new Error("No se pudo guardar el pago");

  if (receipt && receipt.size > 0) {
    const invalid = assertReceiptFile(receipt);
    if (invalid) throw new Error(invalid);
    const saved = await saveReceiptFile(row.id, receipt);
    const [updated] = await db
      .update(landPayments)
      .set({
        receiptPath: saved.relativePath,
        receiptName: saved.name,
        receiptMime: saved.mime,
      })
      .where(eq(landPayments.id, row.id))
      .returning();
    return (
      updated ?? {
        ...row,
        receiptPath: saved.relativePath,
        receiptName: saved.name,
        receiptMime: saved.mime,
      }
    );
  }

  return row;
}
