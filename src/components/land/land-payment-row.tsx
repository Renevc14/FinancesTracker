"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteLandPaymentAction } from "@/lib/actions";
import type { LandPayment } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/utils";

const CONCEPT_LABELS: Record<string, string> = {
  reservation: "Reservation",
  initial: "Down payment",
  installment: "Installment",
  balloon: "Balloon",
  tax: "IT",
  notary: "Notary",
  other: "Other",
};

export function LandPaymentRow({ payment }: { payment: LandPayment }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <li className="ios-row items-start">
      <div className="min-w-0">
        <p className="ios-headline">
          {CONCEPT_LABELS[payment.concept] ?? payment.concept}
          {payment.installmentNumber != null
            ? ` #${payment.installmentNumber}`
            : ""}
        </p>
        <p className="text-[13px] text-[var(--muted)]">
          {formatDate(payment.date)} · {payment.paymentMethod}
          {payment.receiptPath ? (
            <>
              {" · "}
              <a
                href={`/api/receipts/${payment.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--accent)]"
              >
                {payment.receiptName ?? "Receipt"}
              </a>
            </>
          ) : null}
        </p>
        <div className="mt-1 flex gap-3">
          <Link
            href={`/land/${payment.landAssetId}/payments/${payment.id}/edit`}
            className="text-[13px] font-semibold text-[var(--accent)]"
          >
            Edit
          </Link>
          <button
            type="button"
            disabled={pending}
            className="text-[13px] font-semibold text-[var(--danger)] disabled:opacity-40"
            onClick={() => {
              if (!window.confirm("Delete this payment?")) return;
              start(async () => {
                const result = await deleteLandPaymentAction(payment.id);
                if (!result.ok) return;
                router.refresh();
              });
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="money text-[17px] font-semibold">
          {formatMoney(payment.amountLocal, payment.localCurrency)}
        </p>
        {(payment.discountLocal ?? 0) > 0 && (
          <p className="text-[12px] text-[var(--warn)]">
            Disc. {formatMoney(payment.discountLocal, payment.localCurrency)}
          </p>
        )}
        <p className="text-[13px] text-[var(--muted)]">
          {formatMoney(payment.amountUsd, "USD")}
        </p>
      </div>
    </li>
  );
}
