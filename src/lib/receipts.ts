import fs from "node:fs/promises";
import path from "node:path";

export const RECEIPT_MAX_BYTES = 12 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export function receiptsDir(): string {
  return path.join(process.cwd(), "data", "receipts");
}

export function safeReceiptFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\-]+/g, "_").slice(0, 80);
  return base || "comprobante";
}

export function assertReceiptFile(file: File): string | null {
  if (file.size <= 0) return "Archivo vacío";
  if (file.size > RECEIPT_MAX_BYTES) {
    return "El comprobante no puede superar 12 MB";
  }
  const mime = file.type || "application/octet-stream";
  const ext = path.extname(file.name).toLowerCase();
  const okExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".heic", ".heif"];
  if (!ALLOWED_MIME.has(mime) && !okExt.includes(ext)) {
    return "Adjunta una imagen o un PDF";
  }
  return null;
}

export async function saveReceiptFile(
  paymentId: string,
  file: File,
): Promise<{ relativePath: string; name: string; mime: string }> {
  const name = safeReceiptFilename(file.name);
  const dir = path.join(receiptsDir(), paymentId);
  await fs.mkdir(dir, { recursive: true });
  const absolute = path.join(dir, name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolute, buffer);
  return {
    relativePath: path.posix.join("receipts", paymentId, name),
    name,
    mime: file.type || "application/octet-stream",
  };
}

export function absoluteReceiptPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    throw new Error("Invalid receipt path");
  }
  return path.join(process.cwd(), "data", normalized);
}
