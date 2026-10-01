# Hotel website (hotel-lnd)

Website + booking system for a small 9-room hotel.

## Structure

- pnpm monorepo
- apps/web — Next.js (App Router, TypeScript, Tailwind). Frontend only:
  it never connects to the database directly, it gets data from apps/api.
- apps/api — Express + TypeScript. All backend logic and all database access.
- packages/ — shared code (Zod schemas, types), added later

## Stack

- API: Express, PostgreSQL (Neon), Drizzle ORM (node-postgres), Zod
- .env loaded with Node's built-in --env-file (no dotenv)
- Auth: hand-written session auth (httpOnly cookies, sessions table, argon2). No auth libraries.
- Email: Resend

## How to work

- Don't explain code or concepts unless I ask. Keep responses short.
- Work in small steps. Don't do several big steps at once.
- If something is a security issue, flag it in one line.
- Keep code, file names, comments, and commit messages in English.
- Before running a database migration, show me the generated SQL.

## Commands

- `pnpm dev` (root) — runs web (3000) and api (4000)
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` (in apps/api)

## Hotel

- 9 rooms: 1 Double, 2 Triple, 3 Twin, 4 Quadruple, 5 Double, 6 Triple,
  7 Triple, 8 Twin, 9 Quadruple
- Base prices per room per night: Double 120, Twin 120, Triple 150, Quadruple 180 GEL
- Meals per person per night: breakfast 20 GEL, dinner 40 GEL
- Most bookings come from Booking.com

## Business rules

- Money is stored as integers in tetri (150 GEL = 15000).
  Commission rates in basis points (23% = 2300).
- Prices are always calculated on the server, never trusted from the client.
- Prices and commission rates live in the database, never hardcoded.
- A booking stores its own prices and commission rate at creation time
  (later price changes must not affect existing bookings).
- Room price is per room per night (not per guest).
- Meals are per person per night. Children currently pay the same as adults.
- Booking.com bookings:
  - room_total is entered manually (Booking's amount), breakfast is included in it
  - breakfast = true, but not charged separately
  - dinner added at the hotel goes to meals_total
  - commission (from commission_rates, currently 23%) applies only to room_total
- Other sources (website, phone, walk_in): room_total = base_price × nights,
  breakfast/dinner charged separately, no commission.
- total_price = room_total + meals_total
- net_total = total_price - commission_amount
- Double booking must be impossible: enforced in the database
  (exclusion constraint), not only in code. Cancelled bookings don't block dates.
- check_out day is free for a new check_in (date ranges are [check_in, check_out)).
- Bookings are never deleted, they get status 'cancelled'.
- No prepayment: guests pay on arrival, cash or card.
  Paid = paid_at is not null. payment_method and paid_at are set together.
- Daily revenue: net_total ÷ nights, counted for each night of the stay
  (check_in ≤ date < check_out). Cancelled bookings are excluded.
- Daily profit = daily revenue - expenses for that date.
- Website bookings are confirmed immediately (status = confirmed) if a room is free.
- Guests:
  - Website booking form: firstName, lastName, phone (required),
    email (optional), country (optional).
  - documentNumber (ID or passport number) is not collected on the website;
    admin adds it at check-in. Nullable, 5-20 letters/digits, no strict format
    (foreign passports differ from the 11-digit Georgian ID).
  - documentNumber is sensitive: never return it from public endpoints.
- Not implemented yet: card payment bank fee, seasonal prices, child meal pricing.
