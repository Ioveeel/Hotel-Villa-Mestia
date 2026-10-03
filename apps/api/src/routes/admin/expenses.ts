import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.js";
import { expenseCategory, expenses } from "../../db/schema.js";
import { addDays, nightsBetween, todayInHotel } from "../../lib/dates.js";
import { trimmed } from "../../lib/guestInput.js";
import { idParams, parseInput } from "../../lib/validation.js";
import { HttpError } from "../../middleware/errorHandler.js";

const MAX_RANGE_DAYS = 366;

// Range is inclusive: [from, to]
const listQuery = z
  .object({
    from: z.iso.date({ error: "from must be a valid date (YYYY-MM-DD)" }),
    to: z.iso.date({ error: "to must be a valid date (YYYY-MM-DD)" }),
  })
  .check((ctx) => {
    if (ctx.issues.length > 0) return;
    const { from, to } = ctx.value;
    const days = nightsBetween(from, to) + 1;
    if (days < 1) {
      ctx.issues.push({
        code: "custom",
        input: to,
        path: ["to"],
        message: "to cannot be before from",
      });
    } else if (days > MAX_RANGE_DAYS) {
      ctx.issues.push({
        code: "custom",
        input: to,
        path: ["to"],
        message: `Range cannot be longer than ${MAX_RANGE_DAYS} days`,
      });
    }
  });

// Past dates are allowed, at most 1 day ahead (hotel time)
const expenseDate = z.iso
  .date({ error: "date must be a valid date (YYYY-MM-DD)" })
  .refine(
    (d) => d <= addDays(todayInHotel(), 1),
    "date cannot be more than 1 day in the future",
  );

const expenseFields = {
  date: expenseDate,
  category: z.enum(expenseCategory.enumValues, {
    error: `category must be one of: ${expenseCategory.enumValues.join(", ")}`,
  }),
  // In tetri
  amount: z
    .number({ error: "amount must be a number" })
    .int("amount must be a whole number (tetri)")
    .positive("amount must be positive")
    .max(100_000_000, "amount is too large"),
  description: trimmed("description", 500),
};

const objectError = (issue: { code: string }) =>
  issue.code === "unrecognized_keys"
    ? "Body contains unknown fields"
    : "Body must be an object";

const createBody = z.strictObject(
  { ...expenseFields, description: expenseFields.description.optional() },
  { error: objectError },
);

// null clears the description
const updateBody = z
  .strictObject(
    {
      date: expenseFields.date.optional(),
      category: expenseFields.category.optional(),
      amount: expenseFields.amount.optional(),
      description: expenseFields.description.nullable().optional(),
    },
    { error: objectError },
  )
  .refine((b) => Object.keys(b).length > 0, "Nothing to update");

export const adminExpensesRouter = Router();

adminExpensesRouter.get("/", async (req, res) => {
  const { from, to } = parseInput(listQuery, req.query);
  const inRange = and(gte(expenses.date, from), lte(expenses.date, to));

  const items = await db
    .select()
    .from(expenses)
    .where(inRange)
    .orderBy(desc(expenses.date), desc(expenses.id));

  // sum() of integers is bigint, returned as a string by pg
  const byCategory = await db
    .select({
      category: expenses.category,
      total: sql<number>`sum(${expenses.amount})::int`,
    })
    .from(expenses)
    .where(inRange)
    .groupBy(expenses.category)
    .orderBy(expenses.category);

  // In tetri
  res.json({
    from,
    to,
    total: byCategory.reduce((sum, c) => sum + c.total, 0),
    totalsByCategory: byCategory,
    expenses: items,
  });
});

adminExpensesRouter.post("/", async (req, res) => {
  const body = parseInput(createBody, req.body);
  const [expense] = await db
    .insert(expenses)
    .values({ ...body, description: body.description ?? null })
    .returning();
  res.status(201).json(expense);
});

adminExpensesRouter.patch("/:id", async (req, res) => {
  const { id } = parseInput(idParams, req.params);
  const body = parseInput(updateBody, req.body);
  const [expense] = await db
    .update(expenses)
    .set(body)
    .where(eq(expenses.id, id))
    .returning();
  if (!expense) throw new HttpError(404, "Expense not found");
  res.json(expense);
});

adminExpensesRouter.delete("/:id", async (req, res) => {
  const { id } = parseInput(idParams, req.params);
  const deleted = await db
    .delete(expenses)
    .where(eq(expenses.id, id))
    .returning({ id: expenses.id });
  if (deleted.length === 0) throw new HttpError(404, "Expense not found");
  res.status(204).end();
});
