import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { calendarRouter } from "./calendar.js";

export const adminRouter = Router();

// Every admin route requires a logged-in admin
adminRouter.use(requireAuth);

adminRouter.use("/calendar", calendarRouter);
