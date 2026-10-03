"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { describedBy, Field, Select } from "@/components/admin/form-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  createExpense,
  deleteExpense,
  humanizeApiMessage,
  updateExpense,
} from "@/lib/api";
import { addDays, isIsoDate } from "@/lib/dates";
import {
  formatDate,
  formatMonth,
  formatPrice,
  formatTetriAsGel,
  parseGelToTetri,
} from "@/lib/format";
import type { Expense, ExpenseCategory, ExpenseList } from "@/lib/types";
import { cn } from "@/lib/utils";

// Same limits as /admin/expenses (apps/api/src/routes/admin/expenses.ts)
const MAX_DAYS_AHEAD = 1;
const MAX_DESCRIPTION = 500;
const NETWORK_ERROR = "Could not reach the server. Please try again.";

const categories = [
  "food",
  "utilities",
  "salaries",
  "maintenance",
  "supplies",
  "taxes",
  "other",
] as const satisfies readonly ExpenseCategory[];

const categoryLabels: Record<ExpenseCategory, string> = {
  food: "Food",
  utilities: "Utilities",
  salaries: "Salaries",
  maintenance: "Maintenance",
  supplies: "Supplies",
  taxes: "Taxes",
  other: "Other",
};

function makeSchema(today: string) {
  return z.object({
    date: z
      .string()
      .refine(isIsoDate, "Choose a date")
      .refine(
        (d) => d <= addDays(today, MAX_DAYS_AHEAD),
        "Date can be at most 1 day ahead",
      ),
    category: z.enum(categories),
    amount: z
      .string()
      .refine(
        (v) => (parseGelToTetri(v) ?? 0) > 0,
        "Enter an amount, e.g. 45 or 45.50",
      ),
    description: z
      .string()
      .trim()
      .max(MAX_DESCRIPTION, `Description must be at most ${MAX_DESCRIPTION} characters`),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? humanizeApiMessage(err.message) : NETWORK_ERROR;
}

// Expenses arrive newest first, so groups keep that order
function groupByDay(expenses: Expense[]): { date: string; items: Expense[] }[] {
  const groups: { date: string; items: Expense[] }[] = [];
  for (const expense of expenses) {
    const last = groups.at(-1);
    if (last?.date === expense.date) last.items.push(expense);
    else groups.push({ date: expense.date, items: [expense] });
  }
  return groups;
}

export function ExpensesManager({
  list,
  month,
  today,
}: {
  list: ExpenseList;
  month: string;
  today: string;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const days = groupByDay(list.expenses);

  return (
    <div className="space-y-6">
      <QuickAddForm month={month} today={today} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <MonthSummary list={list} month={month} />

        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          {days.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-muted-foreground">
              No expenses in {formatMonth(month)}.
            </p>
          ) : (
            days.map(({ date, items }) => (
              <section
                key={date}
                aria-labelledby={`day-${date}`}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="flex items-baseline justify-between gap-4 border-b border-border bg-surface/50 px-5 py-3">
                  <h2 id={`day-${date}`} className="font-medium">
                    {formatDate(date)}
                  </h2>
                  <p className="font-semibold tabular-nums">
                    <span className="sr-only">Day total: </span>
                    {formatPrice(items.reduce((sum, e) => sum + e.amount, 0))}
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {items.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      today={today}
                      editing={editingId === expense.id}
                      onEdit={() => setEditingId(expense.id)}
                      onDoneEditing={() => setEditingId(null)}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAddForm({ month, today }: { month: string; today: string }) {
  const router = useRouter();
  const [added, setAdded] = useState<Expense | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(today)),
    defaultValues: { date: today, category: "food", amount: "", description: "" },
  });

  async function onSubmit(v: FormValues) {
    setSubmitError(null);
    setAdded(null);
    try {
      const expense = await createExpense({
        date: v.date,
        category: v.category,
        amount: parseGelToTetri(v.amount)!,
        ...(v.description && { description: v.description }),
      });
      // Keep date and category for entering several expenses in a row
      reset({ ...v, amount: "", description: "" });
      setFocus("amount");
      setAdded(expense);
      router.refresh();
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  }

  const dateError = errors.date?.message;
  const amountError = errors.amount?.message;
  const descriptionError = errors.description?.message;
  const addedMonth = added?.date.slice(0, 7);

  return (
    <section
      aria-labelledby="add-expense"
      className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 id="add-expense" className="font-heading text-xl font-semibold tracking-tight">
        Add expense
      </h2>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[10rem_10rem_8rem_minmax(0,1fr)_auto] lg:items-start"
      >
        <Field id="ea-date" label="Date" error={dateError}>
          <Input
            id="ea-date"
            type="date"
            max={addDays(today, MAX_DAYS_AHEAD)}
            {...describedBy("ea-date", dateError)}
            {...register("date")}
          />
        </Field>
        <Field id="ea-category" label="Category">
          <Select id="ea-category" {...register("category")}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ea-amount" label="Amount (₾)" error={amountError}>
          <AmountInput
            id="ea-amount"
            error={amountError}
            {...register("amount")}
          />
        </Field>
        <Field
          id="ea-description"
          label="Description"
          optional
          error={descriptionError}
        >
          <Input
            id="ea-description"
            autoComplete="off"
            maxLength={MAX_DESCRIPTION}
            {...describedBy("ea-description", descriptionError)}
            {...register("description")}
          />
        </Field>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="sm:col-span-2 lg:col-span-1 lg:mt-7"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Plus aria-hidden />
          )}
          Add
        </Button>
      </form>

      <div aria-live="polite" className="text-sm empty:hidden">
        {submitError ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-destructive">
            {submitError}
          </p>
        ) : added ? (
          <p className="text-muted-foreground">
            Added {formatPrice(added.amount)} · {categoryLabels[added.category]} ·{" "}
            {formatDate(added.date)}
            {addedMonth !== month && (
              <>
                {" · "}
                <Link
                  href={`/admin/expenses?month=${addedMonth}`}
                  className="rounded-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Show {formatMonth(addedMonth!)}
                </Link>
              </>
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AmountInput({
  id,
  error,
  ...props
}: React.ComponentProps<"input"> & { id: string; error?: string }) {
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder="45.50"
        className="pr-10 tabular-nums"
        {...describedBy(id, error)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground"
      >
        ₾
      </span>
    </div>
  );
}

function MonthSummary({ list, month }: { list: ExpenseList; month: string }) {
  const byCategory = [...list.totalsByCategory].sort((a, b) => b.total - a.total);

  return (
    <section
      aria-labelledby="month-summary"
      className="space-y-4 rounded-xl bg-surface p-5 lg:sticky lg:top-8"
    >
      <div>
        <h2 id="month-summary" className="text-sm text-muted-foreground">
          Total · {formatMonth(month)}
        </h2>
        <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-price">
          {formatPrice(list.total)}
        </p>
      </div>
      {byCategory.length > 0 && (
        <dl className="space-y-3 border-t border-border pt-4 text-sm">
          {byCategory.map(({ category, total }) => {
            const share = list.total ? Math.round((total / list.total) * 100) : 0;
            return (
              <div key={category} className="space-y-1.5">
                <div className="flex justify-between gap-4">
                  <dt>{categoryLabels[category]}</dt>
                  <dd className="tabular-nums">
                    {formatPrice(total)}
                    <span className="ml-2 inline-block w-9 text-right text-muted-foreground">
                      {share}%
                    </span>
                  </dd>
                </div>
                <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(total / list.total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

function ExpenseRow({
  expense,
  today,
  editing,
  onEdit,
  onDoneEditing,
}: {
  expense: Expense;
  today: string;
  editing: boolean;
  onEdit: () => void;
  onDoneEditing: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // Return focus to the edit button after leaving edit mode
  useEffect(() => {
    if (wasEditing.current && !editing) editButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  async function onDelete() {
    setError(null);
    setDeleting(true);
    try {
      await deleteExpense(expense.id);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <li className="bg-background/40 px-5 py-4">
        <EditExpenseForm expense={expense} today={today} onDone={onDoneEditing} />
      </li>
    );
  }

  const label = categoryLabels[expense.category];

  return (
    <li className={cn("px-5 py-2.5 transition-opacity duration-200", deleting && "opacity-50")}>
      <div className="flex min-h-11 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {expense.description && (
            <p className="break-words">{expense.description}</p>
          )}
        </div>
        <p className="font-medium tabular-nums">{formatPrice(expense.amount)}</p>
        <div className="-mr-2 flex">
          <Button
            ref={editButtonRef}
            variant="ghost"
            size="icon"
            aria-label={`Edit ${label} ${formatPrice(expense.amount)}`}
            disabled={deleting}
            onClick={onEdit}
          >
            <Pencil aria-hidden className="size-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${label} ${formatPrice(expense.amount)}`}
                disabled={deleting}
                className="text-muted-foreground hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Trash2 aria-hidden className="size-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Delete expense?</AlertDialogTitle>
              <AlertDialogDescription>
                {label} · {formatPrice(expense.amount)} · {formatDate(expense.date)}
                {expense.description && <> · {expense.description}</>}. This
                can&apos;t be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="outline">Keep</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={onDelete}>
                    Delete
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {error && (
        <p role="alert" className="pb-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function EditExpenseForm({
  expense,
  today,
  onDone,
}: {
  expense: Expense;
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(today)),
    defaultValues: {
      date: expense.date,
      category: expense.category,
      amount: formatTetriAsGel(expense.amount),
      description: expense.description ?? "",
    },
  });

  useEffect(() => setFocus("amount"), [setFocus]);

  async function onSubmit(v: FormValues) {
    setSubmitError(null);
    try {
      await updateExpense(expense.id, {
        date: v.date,
        category: v.category,
        amount: parseGelToTetri(v.amount)!,
        description: v.description || null,
      });
      onDone();
      router.refresh();
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  }

  const id = `ee-${expense.id}`;
  const dateError = errors.date?.message;
  const amountError = errors.amount?.message;
  const descriptionError = errors.description?.message;

  return (
    <form
      noValidate
      aria-label="Edit expense"
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onDone();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-[10rem_10rem_8rem] md:grid-cols-[10rem_10rem_8rem_minmax(0,1fr)]">
        <Field id={`${id}-date`} label="Date" error={dateError}>
          <Input
            id={`${id}-date`}
            type="date"
            max={addDays(today, MAX_DAYS_AHEAD)}
            {...describedBy(`${id}-date`, dateError)}
            {...register("date")}
          />
        </Field>
        <Field id={`${id}-category`} label="Category">
          <Select id={`${id}-category`} {...register("category")}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${id}-amount`} label="Amount (₾)" error={amountError}>
          <AmountInput
            id={`${id}-amount`}
            error={amountError}
            {...register("amount")}
          />
        </Field>
        <Field
          id={`${id}-description`}
          label="Description"
          optional
          error={descriptionError}
          className="sm:col-span-3 md:col-span-1"
        >
          <Input
            id={`${id}-description`}
            autoComplete="off"
            maxLength={MAX_DESCRIPTION}
            {...describedBy(`${id}-description`, descriptionError)}
            {...register("description")}
          />
        </Field>
      </div>
      {submitError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
