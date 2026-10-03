import { and, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.js";
import { bookings, expenses, rooms } from "../../db/schema.js";
import { HOTEL_TIMEZONE, nightsBetween } from "../../lib/dates.js";
import { buildReport } from "../../lib/reports.js";
import { parseInput } from "../../lib/validation.js";

const MAX_RANGE_DAYS = 366;

// Range is inclusive: [from, to]
const reportQuery = z
  .object({
    from: z.iso.date({ error: "from must be a valid date (YYYY-MM-DD)" }),
    to: z.iso.date({ error: "to must be a valid date (YYYY-MM-DD)" }),
  })
  .check((ctx) => {
    if (ctx.issues.length > 0) return;
    const { from, to } = ctx.value;
    const days = nightsBetween(from, to) + 1;
    if (days < 1) {
      ctx.issues.push({
        code: "custom",
        input: to,
        path: ["to"],
        message: "to cannot be before from",
      });
    } else if (days > MAX_RANGE_DAYS) {
      ctx.issues.push({
        code: "custom",
        input: to,
        path: ["to"],
        message: `Range cannot be longer than ${MAX_RANGE_DAYS} days`,
      });
    }
  });

const notCancelled = ne(bookings.status, "cancelled");

export const adminReportsRouter = Router();

// Daily report, amounts in tetri (exact, not rounded)
adminReportsRouter.get("/", async (req, res) => {
  const { from, to } = parseInput(reportQuery, req.query);
  // paid_at as a date in hotel time
  const paidDate = sql`(${bookings.paidAt} AT TIME ZONE ${HOTEL_TIMEZONE})::date`;

  const [[active], bookingRows, paymentRows, expenseRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(rooms)
      .where(eq(rooms.isActive, true)),
    // Nights in [from, to] or a breakfast morning on from (check_out = from)
    db
      .select({
        roomId: bookings.roomId,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        adults: bookings.adults,
        children: bookings.children,
        breakfast: bookings.breakfast,
        dinner: bookings.dinner,
        totalPrice: sql<number>`${bookings.totalPrice}`,
        netTotal: sql<number>`${bookings.netTotal}`,
      })
      .from(bookings)
      .where(
        and(
          notCancelled,
          lte(bookings.checkIn, to),
          gte(bookings.checkOut, from),
        ),
      ),
    db
      .select({
        paidAt: sql<Date>`${bookings.paidAt}`.mapWith(bookings.paidAt),
        paymentMethod: sql<"cash" | "card">`${bookings.paymentMethod}`,
        amount: sql<number>`${bookings.totalPrice}`,
      })
      .from(bookings)
      .where(
        and(
          notCancelled,
          isNotNull(bookings.paidAt),
          sql`${paidDate} BETWEEN ${from} AND ${to}`,
        ),
      ),
    db
      .select({
        date: expenses.date,
        amount: sql<number>`sum(${expenses.amount})::int`,
      })
      .from(expenses)
      .where(and(gte(expenses.date, from), lte(expenses.date, to)))
      .groupBy(expenses.date),
  ]);

  const { days, totals } = buildReport({
    from,
    to,
    activeRooms: active?.count ?? 0,
    bookings: bookingRows,
    payments: paymentRows,
    expenses: expenseRows,
  });

  res.json({ from, to, days, totals });
});
