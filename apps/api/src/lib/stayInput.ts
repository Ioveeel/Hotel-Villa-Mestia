import { z } from "zod";
import { stayDatesIssues } from "./dates.js";

// Stay fields shared by POST /bookings (JSON body) and GET /quote (query string).
// Query values arrive as strings, so numbers and booleans are coerced there.
export function stayFields(source: "body" | "query") {
  const fromQuery = source === "query";
  const int = (field: string) =>
    (fromQuery
      ? z.coerce.number({ error: `${field} must be a number` })
      : z.number({ error: `${field} must be a number` })
    ).int(`${field} must be a whole number`);
  const bool = (field: string) =>
    fromQuery
      ? z.stringbool({ error: `${field} must be true or false` })
      : z.boolean({ error: `${field} must be true or false` });

  return {
    roomTypeId: int("roomTypeId").positive("roomTypeId must be positive"),
    checkIn: z.iso.date({ error: "checkIn must be a valid date (YYYY-MM-DD)" }),
    checkOut: z.iso.date({ error: "checkOut must be a valid date (YYYY-MM-DD)" }),
    adults: int("adults").min(1, "adults must be at least 1"),
    children: int("children").min(0, "children cannot be negative").default(0),
    breakfast: bool("breakfast").default(false),
    dinner: bool("dinner").default(false),
  };
}

// Cross-field date rules, for use in .check()
export function checkStayDates(ctx: {
  issues: z.core.$ZodRawIssue[];
  value: { checkIn: string; checkOut: string };
}) {
  // Cross-field checks only make sense when every field is valid
  if (ctx.issues.length > 0) return;
  const { checkIn, checkOut } = ctx.value;
  for (const issue of stayDatesIssues(checkIn, checkOut)) {
    ctx.issues.push({
      code: "custom",
      input: ctx.value[issue.path],
      path: [issue.path],
      message: issue.message,
    });
  }
}
