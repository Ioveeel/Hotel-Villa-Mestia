import { and, asc, count, eq, gt, gte, lt, ne, notExists } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { bookings, rooms, roomTypes } from "../db/schema.js";
import { nightsBetween, todayInHotel } from "../lib/dates.js";
import { HttpError } from "../middleware/errorHandler.js";

const MAX_NIGHTS = 30;

const availabilityQuery = z
  .object({
    checkIn: z.iso.date({ error: "checkIn must be a valid date (YYYY-MM-DD)" }),
    checkOut: z.iso.date({ error: "checkOut must be a valid date (YYYY-MM-DD)" }),
    guests: z.coerce
      .number({ error: "guests must be a number" })
      .int("guests must be a whole number")
      .min(1, "guests must be at least 1")
      .max(4, "guests must be at most 4"),
  })
  .check((ctx) => {
    // Cross-field checks only make sense when every field is valid
    if (ctx.issues.length > 0) return;
    const { checkIn, checkOut } = ctx.value;
    if (checkIn < todayInHotel()) {
      ctx.issues.push({
        code: "custom",
        input: checkIn,
        path: ["checkIn"],
        message: "checkIn cannot be in the past",
      });
    }
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) {
      ctx.issues.push({
        code: "custom",
        input: checkOut,
        path: ["checkOut"],
        message: "checkOut must be after checkIn",
      });
    } else if (nights > MAX_NIGHTS) {
      ctx.issues.push({
        code: "custom",
        input: checkOut,
        path: ["checkOut"],
        message: `Stay cannot be longer than ${MAX_NIGHTS} nights`,
      });
    }
  });

export const availabilityRouter = Router();

availabilityRouter.get("/", async (req, res) => {
  const parsed = availabilityQuery.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  const { checkIn, checkOut, guests } = parsed.data;
  const nights = nightsBetween(checkIn, checkOut);

  // Same overlap rule as the bookings_no_overlap constraint: [check_in, check_out)
  const overlappingBooking = db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, rooms.id),
        ne(bookings.status, "cancelled"),
        lt(bookings.checkIn, checkOut),
        gt(bookings.checkOut, checkIn),
      ),
    );

  const availableRooms = count(rooms.id);

  const result = await db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      slug: roomTypes.slug,
      beds: roomTypes.beds,
      maxGuests: roomTypes.maxGuests,
      // In tetri
      basePrice: roomTypes.basePrice,
      availableRooms,
    })
    .from(roomTypes)
    .innerJoin(rooms, eq(rooms.roomTypeId, roomTypes.id))
    .where(
      and(
        gte(roomTypes.maxGuests, guests),
        eq(rooms.isActive, true),
        notExists(overlappingBooking),
      ),
    )
    .groupBy(roomTypes.id)
    .having(gte(availableRooms, 1))
    .orderBy(asc(roomTypes.basePrice), asc(roomTypes.id));

  res.json(
    result.map((t) => ({
      ...t,
      nights,
      // In tetri
      roomTotal: t.basePrice * nights,
    })),
  );
});
