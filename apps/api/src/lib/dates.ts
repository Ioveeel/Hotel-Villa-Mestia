// Dates are plain "YYYY-MM-DD" strings, interpreted in the hotel's timezone.
export const HOTEL_TIMEZONE = "Asia/Tbilisi";

export function todayInHotel(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: HOTEL_TIMEZONE }).format(
    new Date(),
  );
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const MAX_NIGHTS = 30;

// Stay rules shared by availability search and booking creation.
// pastDaysAllowed > 0 lets checkIn be up to that many days before today (admin only).
// Returns one issue per broken rule; empty when the dates are valid.
export function stayDatesIssues(
  checkIn: string,
  checkOut: string,
  pastDaysAllowed = 0,
): { path: "checkIn" | "checkOut"; message: string }[] {
  const issues: { path: "checkIn" | "checkOut"; message: string }[] = [];
  if (checkIn < addDays(todayInHotel(), -pastDaysAllowed)) {
    issues.push({
      path: "checkIn",
      message:
        pastDaysAllowed === 0
          ? "checkIn cannot be in the past"
          : `checkIn cannot be more than ${pastDaysAllowed} days in the past`,
    });
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    issues.push({ path: "checkOut", message: "checkOut must be after checkIn" });
  } else if (nights > MAX_NIGHTS) {
    issues.push({
      path: "checkOut",
      message: `Stay cannot be longer than ${MAX_NIGHTS} nights`,
    });
  }
  return issues;
}
