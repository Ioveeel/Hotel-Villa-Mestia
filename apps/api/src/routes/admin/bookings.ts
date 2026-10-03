import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.js";
import { bookings, guests, rooms } from "../../db/schema.js";
import { nightsBetween } from "../../lib/dates.js";
import { isNoOverlapViolation } from "../../lib/dbErrors.js";
import {
  documentNumber,
  guestFields,
  guestObjectError,
  trimmed,
} from "../../lib/guestInput.js";
import { calculateAdminPrice } from "../../lib/pricing.js";
import { checkStayDates, stayFields } from "../../lib/stayInput.js";
import { HttpError } from "../../middleware/errorHandler.js";

// Admin may enter stays that already started (e.g. late Booking.com entries)
const ADMIN_PAST_DAYS = 365;

// Booking.com guests may have no phone
const adminGuestBody = z.strictObject(
  {
    ...guestFields,
    phone: guestFields.phone.optional(),
    documentNumber: documentNumber.optional(),
  },
  { error: guestObjectError },
);

const { roomTypeId: _roomTypeId, ...stay } = stayFields("body");

const adminBookingBody = z
  .object({
    source: z.enum(["booking_com", "phone", "walk_in"], {
      error: "source must be booking_com, phone or walk_in",
    }),
    roomId: z
      .number({ error: "roomId must be a number" })
      .int("roomId must be a whole number")
      .positive("roomId must be positive"),
    ...stay,
    notes: trimmed("notes", 1000).optional(),
    // In tetri. Required for booking_com, ignored for other sources.
    roomTotal: z
      .number({ error: "roomTotal must be a number" })
      .int("roomTotal must be a whole number (tetri)")
      .positive("roomTotal must be positive")
      .max(100_000_000, "roomTotal is too large")
      .optional(),
    guest: adminGuestBody,
  })
  .check((ctx) => {
    if (ctx.issues.length > 0) return;
    if (ctx.value.source === "booking_com" && ctx.value.roomTotal === undefined) {
      ctx.issues.push({
        code: "custom",
        input: undefined,
        path: ["roomTotal"],
        message: "roomTotal is required for booking_com",
      });
    }
  })
  .check((ctx) => checkStayDates(ctx, ADMIN_PAST_DAYS));

type AdminBookingBody = z.infer<typeof adminBookingBody>;

function parseBody(input: unknown): AdminBookingBody {
  const parsed = adminBookingBody.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  return parsed.data;
}

// Validates the room and calculates prices. Writes nothing.
async function priceBooking(body: AdminBookingBody) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, body.roomId));
  if (!room) throw new HttpError(404, "Room not found");
  if (!room.isActive) throw new HttpError(400, "Room is not active");

  const nights = nightsBetween(body.checkIn, body.checkOut);
  const base = { ...body, roomTypeId: room.roomTypeId, nights };
  const price = await calculateAdminPrice(
    body.source === "booking_com"
      ? { ...base, source: "booking_com", roomTotal: body.roomTotal! }
      : { ...base, source: body.source },
  );
  return { room, nights, price };
}

export const adminBookingsRouter = Router();

adminBookingsRouter.post("/preview", async (req, res) => {
  const body = parseBody(req.body);
  const { nights, price } = await priceBooking(body);

  // In tetri
  res.json({
    nights,
    roomTotal: price.roomTotal,
    mealsTotal: price.mealsTotal,
    totalPrice: price.totalPrice,
    commissionRate: price.commissionRateBp,
    commissionAmount: price.commissionAmount,
    netTotal: price.netTotal,
  });
});

adminBookingsRouter.post("/", async (req, res) => {
  const body = parseBody(req.body);
  const { room, nights, price } = await priceBooking(body);

  try {
    // INSERT ... RETURNING of a single row always returns that row
    const { booking, guest } = await db.transaction(async (tx) => {
      const [guest] = await tx
        .insert(guests)
        .values({
          firstName: body.guest.firstName,
          lastName: body.guest.lastName,
          phone: body.guest.phone ?? null,
          email: body.guest.email ?? null,
          country: body.guest.country ?? null,
          documentNumber: body.guest.documentNumber ?? null,
        })
        .returning();

      const [booking] = await tx
        .insert(bookings)
        .values({
          roomId: room.id,
          guestId: guest!.id,
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          adults: body.adults,
          children: body.children,
          status: "confirmed",
          source: body.source,
          breakfast: price.breakfast,
          dinner: body.dinner,
          roomPricePerNight: price.roomPricePerNight,
          breakfastPrice: price.breakfastPrice,
          dinnerPrice: price.dinnerPrice,
          commissionRateBp: price.commissionRateBp,
          roomTotal: price.roomTotal,
          mealsTotal: price.mealsTotal,
          commissionAmount: price.commissionAmount,
          notes: body.notes ?? null,
        })
        .returning();
      return { booking: booking!, guest: guest! };
    });

    res.status(201).json({
      ...booking,
      nights,
      roomNumber: room.number,
      roomTypeName: price.roomType.name,
      guest,
    });
  } catch (err) {
    // No retry with another room: the admin chose this one
    if (isNoOverlapViolation(err)) {
      throw new HttpError(409, "Room is already booked for these dates");
    }
    throw err;
  }
});
