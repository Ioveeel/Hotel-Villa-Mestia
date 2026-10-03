import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../../db/index.js";
import { rooms, roomTypes } from "../../db/schema.js";

export const adminRoomsRouter = Router();

adminRoomsRouter.get("/", async (_req, res) => {
  const rows = await db
    .select({
      id: rooms.id,
      number: rooms.number,
      roomTypeName: roomTypes.name,
      maxGuests: roomTypes.maxGuests,
      isActive: rooms.isActive,
    })
    .from(rooms)
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
    .orderBy(asc(rooms.number));
  res.json(rows);
});
