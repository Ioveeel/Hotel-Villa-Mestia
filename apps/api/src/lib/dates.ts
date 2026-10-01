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
