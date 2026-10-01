import { db } from "./index.js";
import { commissionRates, mealOptions, rooms, roomTypes } from "./schema.js";

// Safe to run multiple times: existing rows are left untouched
// (prices edited later in the database are not overwritten).

const roomTypeData = [
  {
    name: "Double",
    slug: "double",
    beds: "1 double bed",
    maxGuests: 2,
    basePrice: 12000,
  },
  {
    name: "Twin",
    slug: "twin",
    beds: "2 single beds",
    maxGuests: 2,
    basePrice: 12000,
  },
  {
    name: "Triple",
    slug: "triple",
    beds: "3 single beds",
    maxGuests: 3,
    basePrice: 15000,
  },
  {
    name: "Quadruple",
    slug: "quadruple",
    beds: "1 double bed, 2 single beds",
    maxGuests: 4,
    basePrice: 18000,
  },
];

const roomData: { number: number; slug: string }[] = [
  { number: 1, slug: "double" },
  { number: 2, slug: "triple" },
  { number: 3, slug: "twin" },
  { number: 4, slug: "quadruple" },
  { number: 5, slug: "double" },
  { number: 6, slug: "triple" },
  { number: 7, slug: "triple" },
  { number: 8, slug: "twin" },
  { number: 9, slug: "quadruple" },
];

const RATES_VALID_FROM = "2026-01-01";

async function seed() {
  await db.transaction(async (tx) => {
    await tx.insert(roomTypes).values(roomTypeData).onConflictDoNothing();

    const types = await tx
      .select({ id: roomTypes.id, slug: roomTypes.slug })
      .from(roomTypes);
    const typeIdBySlug = new Map(types.map((t) => [t.slug, t.id]));

    await tx
      .insert(rooms)
      .values(
        roomData.map((r) => {
          const roomTypeId = typeIdBySlug.get(r.slug);
          if (!roomTypeId) throw new Error(`Unknown room type: ${r.slug}`);
          return { number: r.number, roomTypeId };
        }),
      )
      .onConflictDoNothing();

    await tx
      .insert(mealOptions)
      .values([
        { type: "breakfast", price: 2000 },
        { type: "dinner", price: 4000 },
      ])
      .onConflictDoNothing();

    await tx
      .insert(commissionRates)
      .values([
        { source: "booking_com", rateBp: 2300, validFrom: RATES_VALID_FROM },
        { source: "website", rateBp: 0, validFrom: RATES_VALID_FROM },
        { source: "phone", rateBp: 0, validFrom: RATES_VALID_FROM },
        { source: "walk_in", rateBp: 0, validFrom: RATES_VALID_FROM },
      ])
      .onConflictDoNothing();
  });
}

seed()
  .then(() => console.log("Seed complete"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
