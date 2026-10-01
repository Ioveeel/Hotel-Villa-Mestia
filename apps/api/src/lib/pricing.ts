import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { mealOptions, roomTypes } from "../db/schema.js";
import { HttpError } from "../middleware/errorHandler.js";

export type PriceInput = {
  roomTypeId: number;
  nights: number;
  adults: number;
  children: number;
  breakfast: boolean;
  dinner: boolean;
};

// Prices for a website/phone/walk-in stay (no commission). All money in tetri.
// Throws 404 for an unknown room type and 400 for too many guests or an unavailable meal.
export async function calculatePrice(input: PriceInput) {
  const people = input.adults + input.children;

  const [roomType] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, input.roomTypeId));
  if (!roomType) {
    throw new HttpError(404, "Room type not found");
  }
  if (people > roomType.maxGuests) {
    throw new HttpError(
      400,
      `${roomType.name} room allows at most ${roomType.maxGuests} guests`,
    );
  }

  // Children currently pay the same as adults
  const activeMeals = await db
    .select({ type: mealOptions.type, price: mealOptions.price })
    .from(mealOptions)
    .where(eq(mealOptions.isActive, true));
  // Current price per person per night; null when the meal is not offered
  const mealRate = (type: "breakfast" | "dinner") =>
    activeMeals.find((m) => m.type === type)?.price ?? null;
  const breakfastRate = mealRate("breakfast");
  const dinnerRate = mealRate("dinner");

  // Charged price per person per night: 0 when not selected
  const chargedPrice = (
    type: "breakfast" | "dinner",
    wanted: boolean,
    rate: number | null,
  ) => {
    if (!wanted) return 0;
    if (rate === null) throw new HttpError(400, `${type} is not available`);
    return rate;
  };
  const breakfastPrice = chargedPrice("breakfast", input.breakfast, breakfastRate);
  const dinnerPrice = chargedPrice("dinner", input.dinner, dinnerRate);

  const roomTotal = roomType.basePrice * input.nights;
  const mealsTotal = (breakfastPrice + dinnerPrice) * people * input.nights;

  return {
    roomType,
    // Per room per night
    roomPricePerNight: roomType.basePrice,
    // Per person per night, as offered (null when not offered)
    breakfastRate,
    dinnerRate,
    // Per person per night, as charged (0 when not selected)
    breakfastPrice,
    dinnerPrice,
    roomTotal,
    mealsTotal,
    totalPrice: roomTotal + mealsTotal,
  };
}
