import { Router } from "express";
import { z } from "zod";
import { nightsBetween } from "../lib/dates.js";
import { calculatePrice } from "../lib/pricing.js";
import { checkStayDates, stayFields } from "../lib/stayInput.js";
import { HttpError } from "../middleware/errorHandler.js";

const quoteQuery = z.object(stayFields("query")).check(checkStayDates);

export const quoteRouter = Router();

// Public: price for a stay. Does not check availability, writes nothing.
quoteRouter.get("/", async (req, res) => {
  const parsed = quoteQuery.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  const query = parsed.data;
  const nights = nightsBetween(query.checkIn, query.checkOut);
  const price = await calculatePrice({ ...query, nights });

  // In tetri
  res.json({
    nights,
    roomTotal: price.roomTotal,
    mealsTotal: price.mealsTotal,
    totalPrice: price.totalPrice,
    breakdown: {
      roomPerNight: price.roomPricePerNight,
      breakfastPerPersonPerNight: price.breakfastRate,
      dinnerPerPersonPerNight: price.dinnerRate,
    },
  });
});
