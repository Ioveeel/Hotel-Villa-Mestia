import { and, asc, eq, gt, lt, ne, notExists } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { bookings, guests, rooms } from "../db/schema.js";
import { nightsBetween } from "../lib/dates.js";
import { isNoOverlapViolation } from "../lib/dbErrors.js";
import { guestFields, guestObjectError } from "../lib/guestInput.js";
import { calculatePrice } from "../lib/pricing.js";
import { checkStayDates, stayFields } from "../lib/stayInput.js";
import { HttpError } from "../middleware/errorHandler.js";
import { bookingRateLimit } from "../middleware/rateLimit.js";

// documentNumber is added by admin at check-in, never accepted here.
const guestBody = z.strictObject(guestFields, { error: guestObjectError });

const createBookingBody = z
  .object({ ...stayFields("body"), guest: guestBody })
  .check(checkStayDates);

export const bookingsRouter = Router();

// Public: website bookings
bookingsRouter.post("/", bookingRateLimit, async (req, res) => {
  const parsed = createBookingBody.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  const body = parsed.data;
  const nights = nightsBetween(body.checkIn, body.checkOut);
  const { roomType, breakfastPrice, dinnerPrice, roomTotal, mealsTotal } =
    await calculatePrice({ ...body, nights });

  // Same overlap rule as the bookings_no_overlap constraint: [check_in, check_out)
  const overlappingBooking = db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, rooms.id),
        ne(bookings.status, "cancelled"),
        lt(bookings.checkIn, body.checkOut),
        gt(bookings.checkOut, body.checkIn),
      ),
    );

  const freeRooms = await db
    .select({ id: rooms.id, number: rooms.number })
    .from(rooms)
    .where(
      and(
        eq(rooms.roomTypeId, roomType.id),
        eq(rooms.isActive, true),
        notExists(overlappingBooking),
      ),
    )
    .orderBy(asc(rooms.number));

  // Another request may take a room between the check and the insert;
  // the exclusion constraint rejects it and we try the next free room.
  for (const room of freeRooms) {
    try {
      // INSERT ... RETURNING of a single row always returns that row
      const booking = await db.transaction(async (tx) => {
        const [guest] = await tx
          .insert(guests)
          .values({
            firstName: body.guest.firstName,
            lastName: body.guest.lastName,
            phone: body.guest.phone,
            email: body.guest.email ?? null,
            country: body.guest.country ?? null,
          })
          .returning({ id: guests.id });

        const [created] = await tx
          .insert(bookings)
          .values({
            roomId: room.id,
            guestId: guest!.id,
            checkIn: body.checkIn,
            checkOut: body.checkOut,
            adults: body.adults,
            children: body.children,
            status: "confirmed",
            source: "website",
            breakfast: body.breakfast,
            dinner: body.dinner,
            roomPricePerNight: roomType.basePrice,
            breakfastPrice,
            dinnerPrice,
            commissionRateBp: 0,
            roomTotal,
            mealsTotal,
            commissionAmount: 0,
          })
          .returning();
        return created!;
      });

      res.status(201).json({
        id: booking.id,
        roomNumber: room.number,
        roomTypeName: roomType.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
        adults: booking.adults,
        children: booking.children,
        breakfast: booking.breakfast,
        dinner: booking.dinner,
        // In tetri
        roomTotal: booking.roomTotal,
        mealsTotal: booking.mealsTotal,
        totalPrice: booking.totalPrice,
        status: booking.status,
      });
      return;
    } catch (err) {
      if (isNoOverlapViolation(err)) continue;
      throw err;
    }
  }

  throw new HttpError(409, "Room is no longer available for these dates");
});
