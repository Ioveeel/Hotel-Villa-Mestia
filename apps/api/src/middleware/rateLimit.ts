import { rateLimit } from "express-rate-limit";

// In-memory store: counts reset on restart and are not shared between instances.
export const bookingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many booking attempts, please try again later" },
});
