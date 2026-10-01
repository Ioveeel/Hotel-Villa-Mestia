import { and, asc, eq, gt, lt, ne, notExists } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { bookings, guests, rooms } from "../db/schema.js";
import { nightsBetween } from "../lib/dates.js";
import { calculatePrice } from "../lib/pricing.js";
import { checkStayDates, stayFields } from "../lib/stayInput.js";
import { HttpError } from "../middleware/errorHandler.js";
import { bookingRateLimit } from "../middleware/rateLimit.js";

const trimmed = (field: string, max: number) =>
  z
    .string({ error: `${field} must be a string` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be at most ${max} characters`);

// documentNumber is added by admin at check-in, never accepted here.
const guestBody = z.strictObject(
  {
    firstName: trimmed("firstName", 100),
    lastName: trimmed("lastName", 100),
    phone: z
      .string({ error: "phone is required" })
      .trim()
      .regex(
        /^[0-9 +]{7,20}$/,
        "phone must be 7-20 characters: digits, spaces and + only",
      ),
    email: z.email("email must be a valid email address").optional(),
    country: trimmed("country", 100).optional(),
  },
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? "guest contains unknown fields"
        : "guest is required",
  },
);

const createBookingBody = z
  .object({ ...stayFields("body"), guest: guestBody })
  .check(checkStayDates);

const NO_OVERLAP_CONSTRAINT = "bookings_no_overlap";

// drizzle wraps driver errors; the pg error is in `cause`
function isNoOverlapViolation(err: unknown): boolean {
  const pgErr = (err as { cause?: unknown })?.cause ?? err;
  const { code, constraint } = pgErr as { code?: string; constraint?: string };
  return code === "23P01" && constraint === NO_OVERLAP_CONSTRAINT;
}

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
