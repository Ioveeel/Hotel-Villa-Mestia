import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExpensesManager } from "@/components/admin/expenses-manager";
import { Button } from "@/components/ui/button";
import { requireAdmin, sessionHeaders } from "@/lib/admin-session";
import { getExpenses } from "@/lib/api";
import { addMonths, hotelToday, isIsoMonth, monthRange } from "@/lib/dates";
import { formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Expenses" };

// ?month=2026-10 selects the month (default: current month, hotel time)
export default async function ExpensesPage({
  searchParams,
}: PageProps<"/admin/expenses">) {
  await requireAdmin();

  const today = hotelToday();
  const currentMonth = today.slice(0, 7);
  const { month: monthParam } = await searchParams;
  const month =
    typeof monthParam === "string" && isIsoMonth(monthParam)
      ? monthParam
      : currentMonth;

  const list = await getExpenses(monthRange(month), {
    headers: await sessionHeaders(),
    cache: "no-store",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMonth(month)}
          </p>
        </div>
        <nav aria-label="Month" className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon">
            <Link
              href={`/admin/expenses?month=${addMonths(month, -1)}`}
              aria-label={`Previous month (${formatMonth(addMonths(month, -1))})`}
            >
              <ChevronLeft aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href="/admin/expenses"
              aria-current={month === currentMonth ? "page" : undefined}
            >
              This month
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon">
            <Link
              href={`/admin/expenses?month=${addMonths(month, 1)}`}
              aria-label={`Next month (${formatMonth(addMonths(month, 1))})`}
            >
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        </nav>
      </div>

      <ExpensesManager list={list} month={month} today={today} />
    </div>
  );
}
