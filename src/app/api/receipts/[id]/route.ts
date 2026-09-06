import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { landPayments } from "@/lib/db/schema";
import { absoluteReceiptPath } from "@/lib/receipts";
import { and, eq, isNull } from "drizzle-orm";
import { readFile } from "node:fs/promises";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const payment = (
    await db
      .select()
      .from(landPayments)
      .where(and(eq(landPayments.id, id), isNull(landPayments.deletedAt)))
      .limit(1)
  )[0];
  if (!payment?.receiptPath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(absoluteReceiptPath(payment.receiptPath));
    return new Response(file, {
      headers: {
        "Content-Type": payment.receiptMime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${(payment.receiptName ?? "comprobante").replace(/["\\\r\n]/g, "_")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
