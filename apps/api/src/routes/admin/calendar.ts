import { and, asc, eq, gt, lt } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.js";
import { bookings, guests, rooms, roomTypes } from "../../db/schema.js";
import { nightsBetween } from "../../lib/dates.js";
import { HttpError } from "../../middleware/errorHandler.js";

const MAX_CALENDAR_DAYS = 62;

const calendarQuery = z
  .object({
    from: z.iso.date({ error: "from must be a valid date (YYYY-MM-DD)" }),
    to: z.iso.date({ error: "to must be a valid date (YYYY-MM-DD)" }),
  })
  .check((ctx) => {
    if (ctx.issues.length > 0) return;
    const { from, to } = ctx.value;
    const days = nightsBetween(from, to);
    if (days < 1) {
      ctx.issues.push({
        code: "custom",
        input: to,
        path: ["to"],
        message: "to must be after from",
      });
    } else if (days > MAX_CALENDAR_DAYS) {
      ctx.issues.push({
        code: "custom",
        input: to,
        path: ["to"],
        message: `Range cannot be longer than ${MAX_CALENDAR_DAYS} days`,
      });
    }
  });

export const calendarRouter = Router();

// Range is [from, to). Includes cancelled bookings; the client decides how to show them.
calendarRouter.get("/", async (req, res) => {
  const parsed = calendarQuery.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  const { from, to } = parsed.data;

  const roomRows = await db
    .select({
      id: rooms.id,
      number: rooms.number,
      roomTypeName: roomTypes.name,
      isActive: rooms.isActive,
    })
    .from(rooms)
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
    .orderBy(asc(rooms.number));

  // Only the guest's name: no documentNumber, phone or email here
  const bookingRows = await db
    .select({
      id: bookings.id,
      roomId: bookings.roomId,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      status: bookings.status,
      source: bookings.source,
      guestFirstName: guests.firstName,
      guestLastName: guests.lastName,
      adults: bookings.adults,
      children: bookings.children,
      breakfast: bookings.breakfast,
      dinner: bookings.dinner,
      // In tetri
      totalPrice: bookings.totalPrice,
      paidAt: bookings.paidAt,
      paymentMethod: bookings.paymentMethod,
    })
    .from(bookings)
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .where(and(lt(bookings.checkIn, to), gt(bookings.checkOut, from)))
    .orderBy(asc(bookings.checkIn), asc(bookings.id));

  res.json({ from, to, rooms: roomRows, bookings: bookingRows });
});
