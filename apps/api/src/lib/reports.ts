import { addDays, HOTEL_TIMEZONE, nightsBetween } from "./dates.js";

// All amounts are in tetri. All dates are "YYYY-MM-DD" in hotel time.

// Splits total into `parts` whole-tetri amounts that sum to total exactly.
// The remainder goes to the first parts: 100 over 3 -> [34, 33, 33].
export function splitEvenly(total: number, parts: number): number[] {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("total must be a non-negative integer");
  }
  if (!Number.isInteger(parts) || parts < 1) {
    throw new Error("parts must be a positive integer");
  }
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Calendar date of a timestamp in hotel time
export function toHotelDate(instant: Date): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: HOTEL_TIMEZONE }).format(
    instant,
  );
}

export type ReportBooking = {
  roomId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  breakfast: boolean;
  dinner: boolean;
  totalPrice: number;
  netTotal: number;
};

export type ReportPayment = {
  paidAt: Date;
  paymentMethod: "cash" | "card";
  amount: number;
};

export type ReportExpense = { date: string; amount: number };

export type ReportDay = {
  date: string;
  occupiedRooms: number;
  activeRooms: number;
  // Percent, one decimal
  occupancy: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  expenses: number;
  profit: number;
  cashReceived: number;
  cardReceived: number;
  breakfastGuests: number;
  dinnerGuests: number;
};

export type ReportTotals = Omit<ReportDay, "date" | "activeRooms"> & {
  // Room-nights available in the range
  activeRoomNights: number;
};

function occupancyPercent(occupied: number, available: number): number {
  if (available === 0) return 0;
  return Math.round((occupied / available) * 1000) / 10;
}

// Input must not contain cancelled bookings.
// Range is inclusive: [from, to].
export function buildReport(input: {
  from: string;
  to: string;
  activeRooms: number;
  bookings: ReportBooking[];
  payments: ReportPayment[];
  expenses: ReportExpense[];
}): { days: ReportDay[]; totals: ReportTotals } {
  const { from, to, activeRooms } = input;
  const dayCount = nightsBetween(from, to) + 1;

  const days: ReportDay[] = Array.from({ length: dayCount }, (_, i) => ({
    date: addDays(from, i),
    occupiedRooms: 0,
    activeRooms,
    occupancy: 0,
    grossRevenue: 0,
    commission: 0,
    netRevenue: 0,
    expenses: 0,
    profit: 0,
    cashReceived: 0,
    cardReceived: 0,
    breakfastGuests: 0,
    dinnerGuests: 0,
  }));

  // Day for a date, or undefined when outside the range
  const dayOf = (date: string) => days[nightsBetween(from, date)];
  const occupiedByDay = days.map(() => new Set<number>());

  for (const b of input.bookings) {
    const nights = nightsBetween(b.checkIn, b.checkOut);
    // Gross and net are each split exactly; per-night commission is the
    // difference, so it also sums exactly and is never negative.
    const gross = splitEvenly(b.totalPrice, nights);
    const net = splitEvenly(b.netTotal, nights);
    const guests = b.adults + b.children;

    for (let i = 0; i < nights; i++) {
      const date = addDays(b.checkIn, i);
      const day = dayOf(date);
      if (day) {
        occupiedByDay[nightsBetween(from, date)]!.add(b.roomId);
        day.grossRevenue += gross[i]!;
        day.netRevenue += net[i]!;
        day.commission += gross[i]! - net[i]!;
        // Dinner: evenings check_in .. check_out - 1
        if (b.dinner) day.dinnerGuests += guests;
      }
      // Breakfast: mornings check_in + 1 .. check_out
      if (b.breakfast) {
        const morning = dayOf(addDays(b.checkIn, i + 1));
        if (morning) morning.breakfastGuests += guests;
      }
    }
  }

  for (const p of input.payments) {
    const day = dayOf(toHotelDate(p.paidAt));
    if (!day) continue;
    if (p.paymentMethod === "cash") day.cashReceived += p.amount;
    else day.cardReceived += p.amount;
  }

  for (const e of input.expenses) {
    const day = dayOf(e.date);
    if (day) day.expenses += e.amount;
  }

  const totals: ReportTotals = {
    occupiedRooms: 0,
    activeRoomNights: activeRooms * dayCount,
    occupancy: 0,
    grossRevenue: 0,
    commission: 0,
    netRevenue: 0,
    expenses: 0,
    profit: 0,
    cashReceived: 0,
    cardReceived: 0,
    breakfastGuests: 0,
    dinnerGuests: 0,
  };

  days.forEach((day, i) => {
    day.occupiedRooms = occupiedByDay[i]!.size;
    day.occupancy = occupancyPercent(day.occupiedRooms, activeRooms);
    day.profit = day.netRevenue - day.expenses;

    totals.occupiedRooms += day.occupiedRooms;
    totals.grossRevenue += day.grossRevenue;
    totals.commission += day.commission;
    totals.netRevenue += day.netRevenue;
    totals.expenses += day.expenses;
    totals.profit += day.profit;
    totals.cashReceived += day.cashReceived;
    totals.cardReceived += day.cardReceived;
    totals.breakfastGuests += day.breakfastGuests;
    totals.dinnerGuests += day.dinnerGuests;
  });
  totals.occupancy = occupancyPercent(
    totals.occupiedRooms,
    totals.activeRoomNights,
  );

  return { days, totals };
}
