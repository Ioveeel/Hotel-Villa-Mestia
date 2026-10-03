import { z } from "zod";
import { HttpError } from "../middleware/errorHandler.js";

// Parses input or throws 400 with all issue messages
export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  return parsed.data;
}

// Postgres serial (int4) max
export const MAX_ID = 2_147_483_647;

// Route param ":id" as a positive integer
export const idParams = z.object({
  id: z
    .string()
    .regex(/^[1-9][0-9]{0,9}$/, "id must be a positive whole number")
    .transform(Number)
    .refine((n) => n <= MAX_ID, "id is too large"),
});
