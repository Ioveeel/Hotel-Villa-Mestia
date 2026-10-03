// Dates are plain "YYYY-MM-DD" strings.

// Local date as YYYY-MM-DD
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// Today in the hotel's time zone, independent of where the server runs
export function hotelToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tbilisi" }).format(
    new Date(),
  );
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// Months are "YYYY-MM" strings
export function isIsoMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// ("2026-10", 1) -> "2026-11"
export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1 + months, 1)).slice(0, 7);
}

// "2026-10" -> { from: "2026-10-01", to: "2026-10-31" } (inclusive)
export function monthRange(month: string): { from: string; to: string } {
  return {
    from: `${month}-01`,
    to: addDays(`${addMonths(month, 1)}-01`, -1),
  };
}

export type RangePreset = "today" | "week" | "month" | "last-month";

// Inclusive ranges; weeks start on Monday
export function presetRange(
  preset: RangePreset,
  today: string,
): { from: string; to: string } {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      // getUTCDay: 0 = Sunday
      const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
      const from = addDays(today, -weekday);
      return { from, to: addDays(from, 6) };
    }
    case "month":
      return monthRange(today.slice(0, 7));
    case "last-month":
      return monthRange(addMonths(today.slice(0, 7), -1));
  }
}
