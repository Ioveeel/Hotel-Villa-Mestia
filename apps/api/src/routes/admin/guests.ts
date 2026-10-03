import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.js";
import { guests } from "../../db/schema.js";
import { documentNumber } from "../../lib/guestInput.js";
import { idParams, parseInput } from "../../lib/validation.js";
import { HttpError } from "../../middleware/errorHandler.js";

// null clears the document number
const patchGuestBody = z.strictObject(
  { documentNumber: documentNumber.nullable() },
  { error: "Body must be { documentNumber: string | null }" },
);

export const adminGuestsRouter = Router();

adminGuestsRouter.patch("/:id", async (req, res) => {
  const { id } = parseInput(idParams, req.params);
  const body = parseInput(patchGuestBody, req.body);

  const [guest] = await db
    .update(guests)
    .set({ documentNumber: body.documentNumber })
    .where(eq(guests.id, id))
    .returning({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      phone: guests.phone,
      email: guests.email,
      country: guests.country,
      documentNumber: guests.documentNumber,
      notes: guests.notes,
    });
  if (!guest) throw new HttpError(404, "Guest not found");

  res.json(guest);
});
