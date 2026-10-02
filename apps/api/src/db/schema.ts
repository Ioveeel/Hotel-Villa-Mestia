import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// All money columns are integers in tetri (150 GEL = 15000).
// All commission rates are integers in basis points (23% = 2300).

export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
]);

export const bookingSource = pgEnum("booking_source", [
  "website",
  "booking_com",
  "phone",
  "walk_in",
]);

export const paymentMethod = pgEnum("payment_method", ["cash", "card"]);

export const mealType = pgEnum("meal_type", ["breakfast", "dinner"]);

export const expenseCategory = pgEnum("expense_category", [
  "food",
  "utilities",
  "salaries",
  "maintenance",
  "supplies",
  "taxes",
  "other",
]);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const roomTypes = pgTable(
  "room_types",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    beds: text("beds").notNull(),
    maxGuests: integer("max_guests").notNull(),
    // Per room per night
    basePrice: integer("base_price").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("room_types_max_guests_check", sql`${t.maxGuests} > 0`),
    check("room_types_base_price_check", sql`${t.basePrice} >= 0`),
  ],
);

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    number: integer("number").notNull().unique(),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("rooms_number_check", sql`${t.number} > 0`)],
);

export const guests = pgTable(
  "guests",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    // Nullable: Booking.com guests may not have one. Required on the website form.
    phone: text("phone"),
    country: text("country"),
    // ID or passport number, added by admin at check-in.
    // Sensitive: never return from public endpoints.
    documentNumber: text("document_number"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "guests_document_number_check",
      sql`${t.documentNumber} ~ '^[A-Za-z0-9]{5,20}$'`,
    ),
  ],
);

export const mealOptions = pgTable(
  "meal_options",
  {
    id: serial("id").primaryKey(),
    type: mealType("type").notNull().unique(),
    // Per person per night
    price: integer("price").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("meal_options_price_check", sql`${t.price} >= 0`)],
);

// History of rates: the current rate for a source is the row with the
// latest valid_from <= today.
export const commissionRates = pgTable(
  "commission_rates",
  {
    id: serial("id").primaryKey(),
    source: bookingSource("source").notNull(),
    rateBp: integer("rate_bp").notNull(),
    validFrom: date("valid_from").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("commission_rates_source_valid_from_unique").on(
      t.source,
      t.validFrom,
    ),
    check(
      "commission_rates_rate_bp_check",
      sql`${t.rateBp} >= 0 AND ${t.rateBp} <= 10000`,
    ),
  ],
);

// No-overlap exclusion constraint is added in a custom migration
// (drizzle-kit does not support EXCLUDE constraints).
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    guestId: integer("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "restrict" }),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    adults: integer("adults").notNull(),
    children: integer("children").notNull().default(0),
    status: bookingStatus("status").notNull().default("pending"),
    source: bookingSource("source").notNull(),
    // Booking.com reservation number
    externalRef: text("external_ref"),

    breakfast: boolean("breakfast").notNull().default(false),
    dinner: boolean("dinner").notNull().default(false),

    // Price snapshots at creation time
    // Null for booking_com (room_total is entered manually)
    roomPricePerNight: integer("room_price_per_night"),
    // Per person per night; 0 when not charged
    breakfastPrice: integer("breakfast_price").notNull().default(0),
    dinnerPrice: integer("dinner_price").notNull().default(0),
    commissionRateBp: integer("commission_rate_bp").notNull().default(0),

    // Totals
    roomTotal: integer("room_total").notNull(),
    mealsTotal: integer("meals_total").notNull().default(0),
    totalPrice: integer("total_price").generatedAlwaysAs(
      sql`room_total + meals_total`,
    ),
    commissionAmount: integer("commission_amount").notNull().default(0),
    netTotal: integer("net_total").generatedAlwaysAs(
      sql`room_total + meals_total - commission_amount`,
    ),

    // Payment on arrival
    paymentMethod: paymentMethod("payment_method"),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("bookings_source_external_ref_unique").on(t.source, t.externalRef),
    index("bookings_room_dates_idx").on(t.roomId, t.checkIn, t.checkOut),
    index("bookings_dates_idx").on(t.checkIn, t.checkOut),
    index("bookings_guest_id_idx").on(t.guestId),

    check("bookings_dates_check", sql`${t.checkOut} > ${t.checkIn}`),
    check("bookings_adults_check", sql`${t.adults} >= 1`),
    check("bookings_children_check", sql`${t.children} >= 0`),
    check(
      "bookings_amounts_check",
      sql`${t.roomTotal} >= 0 AND ${t.mealsTotal} >= 0 AND ${t.commissionAmount} >= 0
        AND ${t.breakfastPrice} >= 0 AND ${t.dinnerPrice} >= 0
        AND (${t.roomPricePerNight} IS NULL OR ${t.roomPricePerNight} >= 0)`,
    ),
    check(
      "bookings_commission_rate_bp_check",
      sql`${t.commissionRateBp} >= 0 AND ${t.commissionRateBp} <= 10000`,
    ),
    check(
      "bookings_commission_le_room_total_check",
      sql`${t.commissionAmount} <= ${t.roomTotal}`,
    ),
    // Booking.com: breakfast always included, room_total entered manually.
    // Other sources: no commission, room price snapshot required.
    check(
      "bookings_source_rules_check",
      sql`(${t.source} = 'booking_com' AND ${t.breakfast} = true AND ${t.breakfastPrice} = 0)
        OR (${t.source} <> 'booking_com' AND ${t.commissionRateBp} = 0
            AND ${t.commissionAmount} = 0 AND ${t.roomPricePerNight} IS NOT NULL)`,
    ),
    check(
      "bookings_payment_check",
      sql`(${t.paymentMethod} IS NULL) = (${t.paidAt} IS NULL)`,
    ),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    category: expenseCategory("category").notNull(),
    amount: integer("amount").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("expenses_date_idx").on(t.date),
    check("expenses_amount_check", sql`${t.amount} > 0`),
  ],
);

// Emails are stored lowercase.
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

// id is the SHA-256 hash (hex) of the session token; the token itself is never stored.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_admin_id_idx").on(t.adminId)],
);
