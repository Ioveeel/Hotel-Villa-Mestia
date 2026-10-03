import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { adminBookingsRouter } from "./bookings.js";
import { calendarRouter } from "./calendar.js";
import { adminRoomsRouter } from "./rooms.js";

export const adminRouter = Router();

// Every admin route requires a logged-in admin
adminRouter.use(requireAuth);

adminRouter.use("/calendar", calendarRouter);
adminRouter.use("/bookings", adminBookingsRouter);
adminRouter.use("/rooms", adminRoomsRouter);
