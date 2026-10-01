import { z } from "zod";

// Same rules as the guest in POST /bookings (apps/api/src/routes/bookings.ts).
// Optional fields are "" in the form and omitted from the request.
const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(100, `${label} must be at most 100 characters`);

export const guestSchema = z.object({
  firstName: name("First name"),
  lastName: name("Last name"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9 +]{7,20}$/, "Use 7–20 characters: digits, spaces and +"),
  email: z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), z.email("Enter a valid email address")])),
  country: z.string().trim().max(100, "Country must be at most 100 characters"),
});

export type GuestValues = z.infer<typeof guestSchema>;

export const guestFields = ["firstName", "lastName", "phone", "email", "country"] as const;
