import { and, asc, count, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { rooms, roomTypes } from "../db/schema.js";

export const roomTypesRouter = Router();

roomTypesRouter.get("/", async (_req, res) => {
  const result = await db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      slug: roomTypes.slug,
      description: roomTypes.description,
      beds: roomTypes.beds,
      maxGuests: roomTypes.maxGuests,
      // In tetri
      basePrice: roomTypes.basePrice,
      activeRooms: count(rooms.id),
    })
    .from(roomTypes)
    .leftJoin(
      rooms,
      and(eq(rooms.roomTypeId, roomTypes.id), eq(rooms.isActive, true)),
    )
    .groupBy(roomTypes.id)
    .orderBy(asc(roomTypes.basePrice), asc(roomTypes.id));

  res.json(result);
});
