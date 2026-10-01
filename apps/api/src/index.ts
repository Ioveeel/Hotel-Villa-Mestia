import express from "express";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { availabilityRouter } from "./routes/availability.js";
import { bookingsRouter } from "./routes/bookings.js";
import { quoteRouter } from "./routes/quote.js";
import { healthRouter } from "./routes/health.js";
import { roomTypesRouter } from "./routes/roomTypes.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());

app.use(healthRouter);
app.use("/room-types", roomTypesRouter);
app.use("/availability", availabilityRouter);
app.use("/bookings", bookingsRouter);
app.use("/quote", quoteRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`API listening on http://localhost:${PORT}`);
});
