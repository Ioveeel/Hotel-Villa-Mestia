import { z } from "zod";

export const trimmed = (field: string, max: number) =>
  z
    .string({ error: `${field} must be a string` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be at most ${max} characters`);

// Guest fields shared by website and admin booking forms
export const guestFields = {
  firstName: trimmed("firstName", 100),
  lastName: trimmed("lastName", 100),
  phone: z
    .string({ error: "phone is required" })
    .trim()
    .regex(
      /^[0-9 +]{7,20}$/,
      "phone must be 7-20 characters: digits, spaces and + only",
    ),
  email: z.email("email must be a valid email address").optional(),
  country: trimmed("country", 100).optional(),
};

// Same rule as guests_document_number_check
export const documentNumber = z
  .string({ error: "documentNumber must be a string" })
  .trim()
  .regex(
    /^[A-Za-z0-9]{5,20}$/,
    "documentNumber must be 5-20 letters or digits",
  );

export const guestObjectError = (issue: { code: string }) =>
  issue.code === "unrecognized_keys"
    ? "guest contains unknown fields"
    : "guest is required";
