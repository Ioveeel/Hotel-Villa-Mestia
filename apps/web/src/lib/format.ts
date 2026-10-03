// 12000 tetri -> "120 ₾", 12050 -> "120.50 ₾"
export function formatPrice(tetri: number): string {
  const lari = tetri / 100;
  const amount = Number.isInteger(lari) ? String(lari) : lari.toFixed(2);
  return `${amount} ₾`;
}

// "2026-10-08" -> "Thu, 8 Oct 2026"
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

const GEL_PATTERN = /^(\d{1,7})(?:[.,](\d{1,2}))?$/;

// "220" -> 22000, "220.5" -> 22050, "220,50" -> 22050. null when invalid.
// String math only: floats can't represent most decimals exactly.
export function parseGelToTetri(input: string): number | null {
  const match = GEL_PATTERN.exec(input.trim());
  if (!match) return null;
  const [, lari, tetri = ""] = match;
  return Number(lari + tetri.padEnd(2, "0"));
}

// "2026-10-03T12:04:53Z" -> "3 Oct 2026, 16:04" (hotel time)
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tbilisi",
  }).format(new Date(iso));
}

// "2026-10" -> "October 2026"
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

// 22050 -> "220.50", 22000 -> "220" (for prefilling amount inputs)
export function formatTetriAsGel(tetri: number): string {
  const lari = Math.floor(tetri / 100);
  const rest = tetri % 100;
  return rest ? `${lari}.${String(rest).padStart(2, "0")}` : String(lari);
}

// Report display rounding to 5 tetri by the last digit:
// 0-2 -> 0, 3-7 -> 5, 8-9 -> next 10. Negative amounts round by magnitude.
export function roundToFiveTetri(tetri: number): number {
  const abs = Math.abs(tetri);
  const last = abs % 10;
  const step = last <= 2 ? 0 : last <= 7 ? 5 : 10;
  const rounded = abs - last + step;
  return tetri < 0 && rounded !== 0 ? -rounded : rounded;
}

// Exact report amount -> "1,234.55 ₾" (rounded to 5 tetri, grouped thousands)
export function formatReportAmount(tetri: number): string {
  const lari = roundToFiveTetri(tetri) / 100;
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(lari) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(lari);
  return `${amount} ₾`;
}
