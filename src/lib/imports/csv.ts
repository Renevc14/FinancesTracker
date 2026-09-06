export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function zipRow(header: string[], cols: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) {
    row[header[i]!] = cols[i] ?? "";
  }
  return row;
}

export function isoDateFromUnknown(value: string): string {
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    return `${slash[3]}-${slash[1]!.padStart(2, "0")}-${slash[2]!.padStart(2, "0")}`;
  }
  const t = Date.parse(value);
  if (Number.isNaN(t)) throw new Error(`Fecha inválida: ${value}`);
  return new Date(t).toISOString().slice(0, 10);
}
