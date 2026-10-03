import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.js";
import {
  bookingSource,
  bookingStatus,
  bookings,
  guests,
  rooms,
  roomTypes,
} from "../../db/schema.js";
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
import { idParams, MAX_ID, parseInput } from "../../lib/validation.js";
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

const bookingFields = {
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
};

// Cross-field rules, for use in .check()
function checkBookingRules(ctx: {
  issues: z.core.$ZodRawIssue[];
  value: {
    source: string;
    roomTotal?: number;
    checkIn: string;
    checkOut: string;
  };
}) {
  if (ctx.issues.length > 0) return;
  if (ctx.value.source === "booking_com" && ctx.value.roomTotal === undefined) {
    ctx.issues.push({
      code: "custom",
      input: undefined,
      path: ["roomTotal"],
      message: "roomTotal is required for booking_com",
    });
  }
  checkStayDates(ctx, ADMIN_PAST_DAYS);
}

// Preview takes the same fields without the guest, so it works before names are entered
const previewBody = z.object(bookingFields).check(checkBookingRules);
const createBody = z
  .object({ ...bookingFields, guest: adminGuestBody })
  .check(checkBookingRules);

type PreviewBody = z.infer<typeof previewBody>;

// Validates the room and calculates prices. Writes nothing.
async function priceBooking(body: PreviewBody) {
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

const pageNumber = (name: string, max: number) =>
  z
    .string()
    .regex(/^[1-9][0-9]{0,5}$/, `${name} must be a positive whole number`)
    .transform(Number)
    .refine((n) => n <= max, `${name} cannot be more than ${max}`);

// All filters optional. from/to are inclusive days: a stay matches if it has a night in [from, to].
const listQuery = z
  .object({
    q: z
      .string({ error: "q must be a string" })
      .trim()
      .max(100, "q is too long")
      .optional(),
    status: z
      .enum(bookingStatus.enumValues, {
        error: `status must be one of: ${bookingStatus.enumValues.join(", ")}`,
      })
      .optional(),
    source: z
      .enum(bookingSource.enumValues, {
        error: `source must be one of: ${bookingSource.enumValues.join(", ")}`,
      })
      .optional(),
    from: z.iso
      .date({ error: "from must be a valid date (YYYY-MM-DD)" })
      .optional(),
    to: z.iso.date({ error: "to must be a valid date (YYYY-MM-DD)" }).optional(),
    paid: z
      .enum(["true", "false"], { error: "paid must be true or false" })
      .transform((v) => v === "true")
      .optional(),
    page: pageNumber("page", 100_000).default(1),
    pageSize: pageNumber("pageSize", 100).default(25),
  })
  .check((ctx) => {
    if (ctx.issues.length > 0) return;
    const { from, to } = ctx.value;
    if (from && to && to < from) {
      ctx.issues.push({
        code: "custom",
        input: to,
        path: ["to"],
        message: "to cannot be before from",
      });
    }
  });

// Escapes LIKE wildcards so user input matches literally
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, "\\$&");
}

function searchCondition(q: string): SQL | undefined {
  const pattern = `%${escapeLike(q)}%`;
  const conditions: (SQL | undefined)[] = [
    ilike(guests.firstName, pattern),
    ilike(guests.lastName, pattern),
    // "John Smith"
    sql`(${guests.firstName} || ' ' || ${guests.lastName}) ILIKE ${pattern}`,
    ilike(guests.phone, pattern),
    ilike(guests.email, pattern),
  ];
  if (/^[0-9]{1,10}$/.test(q) && Number(q) <= MAX_ID) {
    conditions.push(eq(bookings.id, Number(q)));
  }
  return or(...conditions);
}

// Booking list for admin, newest check-in first. Amounts in tetri.
adminBookingsRouter.get("/", async (req, res) => {
  const query = parseInput(listQuery, req.query);

  const where = and(
    query.q ? searchCondition(query.q) : undefined,
    query.status ? eq(bookings.status, query.status) : undefined,
    query.source ? eq(bookings.source, query.source) : undefined,
    query.to ? lte(bookings.checkIn, query.to) : undefined,
    query.from ? gt(bookings.checkOut, query.from) : undefined,
    query.paid === undefined
      ? undefined
      : query.paid
        ? isNotNull(bookings.paidAt)
        : isNull(bookings.paidAt),
  );

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: bookings.id,
        roomNumber: rooms.number,
        roomTypeName: roomTypes.name,
        guestFirstName: guests.firstName,
        guestLastName: guests.lastName,
        phone: guests.phone,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        source: bookings.source,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        netTotal: bookings.netTotal,
        paidAt: bookings.paidAt,
        paymentMethod: bookings.paymentMethod,
      })
      .from(bookings)
      .innerJoin(rooms, eq(rooms.id, bookings.roomId))
      .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
      .innerJoin(guests, eq(guests.id, bookings.guestId))
      .where(where)
      .orderBy(desc(bookings.checkIn), desc(bookings.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ total: count() })
      .from(bookings)
      .innerJoin(guests, eq(guests.id, bookings.guestId))
      .where(where),
  ]);

  res.json({
    items: rows.map(({ guestFirstName, guestLastName, ...row }) => ({
      ...row,
      guestName: `${guestFirstName} ${guestLastName}`,
      nights: nightsBetween(row.checkIn, row.checkOut),
    })),
    total: totalRow!.total,
    page: query.page,
    pageSize: query.pageSize,
  });
});

adminBookingsRouter.post("/preview", async (req, res) => {
  const body = parseInput(previewBody, req.body);
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
  const body = parseInput(createBody, req.body);
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

const payBody = z.strictObject(
  {
    method: z.enum(["cash", "card"], { error: "method must be cash or card" }),
  },
  { error: "Body must be { method: cash | card }" },
);

// Full booking with guest, room and prices (in tetri). Admin only: includes documentNumber.
async function getBookingDetails(id: number) {
  const [row] = await db
    .select({
      booking: bookings,
      roomNumber: rooms.number,
      roomTypeName: roomTypes.name,
      guest: {
        id: guests.id,
        firstName: guests.firstName,
        lastName: guests.lastName,
        phone: guests.phone,
        email: guests.email,
        country: guests.country,
        documentNumber: guests.documentNumber,
        notes: guests.notes,
      },
    })
    .from(bookings)
    .innerJoin(rooms, eq(rooms.id, bookings.roomId))
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .where(eq(bookings.id, id));
  if (!row) throw new HttpError(404, "Booking not found");

  return {
    ...row.booking,
    nights: nightsBetween(row.booking.checkIn, row.booking.checkOut),
    roomNumber: row.roomNumber,
    roomTypeName: row.roomTypeName,
    guest: row.guest,
  };
}

// Called when a conditional update matched no row: tells 404 from 409
async function explainNoUpdate(id: number) {
  const [row] = await db
    .select({ status: bookings.status, paidAt: bookings.paidAt })
    .from(bookings)
    .where(eq(bookings.id, id));
  if (!row) throw new HttpError(404, "Booking not found");
  return row;
}

adminBookingsRouter.get("/:id", async (req, res) => {
  const { id } = parseInput(idParams, req.params);
  res.json(await getBookingDetails(id));
});

adminBookingsRouter.post("/:id/pay", async (req, res) => {
  const { id } = parseInput(idParams, req.params);
  const { method } = parseInput(payBody, req.body);

  const updated = await db
    .update(bookings)
    .set({ paymentMethod: method, paidAt: new Date() })
    .where(
      and(
        eq(bookings.id, id),
        ne(bookings.status, "cancelled"),
        isNull(bookings.paidAt),
      ),
    )
    .returning({ id: bookings.id });

  if (updated.length === 0) {
    const row = await explainNoUpdate(id);
    if (row.status === "cancelled") {
      throw new HttpError(409, "Booking is cancelled");
    }
    throw new HttpError(409, "Booking is already paid");
  }
  res.json(await getBookingDetails(id));
});

adminBookingsRouter.post("/:id/unpay", async (req, res) => {
  const { id } = parseInput(idParams, req.params);

  const updated = await db
    .update(bookings)
    .set({ paymentMethod: null, paidAt: null })
    .where(eq(bookings.id, id))
    .returning({ id: bookings.id });
  if (updated.length === 0) throw new HttpError(404, "Booking not found");

  res.json(await getBookingDetails(id));
});

// Payment info is kept as it was
adminBookingsRouter.post("/:id/cancel", async (req, res) => {
  const { id } = parseInput(idParams, req.params);

  const updated = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, id), ne(bookings.status, "cancelled")))
    .returning({ id: bookings.id });

  if (updated.length === 0) {
    await explainNoUpdate(id);
    throw new HttpError(409, "Booking is already cancelled");
  }
  res.json(await getBookingDetails(id));
});
