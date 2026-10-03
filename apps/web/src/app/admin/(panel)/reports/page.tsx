import type { Metadata } from "next";
import Link from "next/link";
import { ReportChart } from "@/components/admin/report-chart";
import { ReportTable } from "@/components/admin/report-table";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin, sessionHeaders } from "@/lib/admin-session";
import { getReport } from "@/lib/api";
import {
  addDays,
  daysBetween,
  hotelToday,
  isIsoDate,
  presetRange,
  type RangePreset,
} from "@/lib/dates";
import { formatDate, formatPriceRounded } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

// Same limit as GET /admin/reports
const MAX_RANGE_DAYS = 366;

const presets: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
];

// Round trip through addDays rejects dates like 2026-02-31
function validDate(value: unknown): value is string {
  return (
    typeof value === "string" && isIsoDate(value) && addDays(value, 0) === value
  );
}

// ?range=<preset> or ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive).
// Default: this month (hotel time).
function resolveRange(
  params: Record<string, string | string[] | undefined>,
  today: string,
): { from: string; to: string } {
  const { from, to, range } = params;
  if (validDate(from) && validDate(to)) {
    const days = daysBetween(from, to) + 1;
    if (days >= 1 && days <= MAX_RANGE_DAYS) return { from, to };
  }
  const preset = presets.find((p) => p.value === range)?.value ?? "month";
  return presetRange(preset, today);
}

export default async function ReportsPage({
  searchParams,
}: PageProps<"/admin/reports">) {
  await requireAdmin();

  const today = hotelToday();
  const { from, to } = resolveRange(await searchParams, today);
  const activePreset = presets.find((p) => {
    const r = presetRange(p.value, today);
    return r.from === from && r.to === to;
  })?.value;

  const report = await getReport(
    { from, to },
    { headers: await sessionHeaders(), cache: "no-store" },
  );
  const { totals } = report;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {from === to
              ? formatDate(from)
              : `${formatDate(from)} – ${formatDate(to)}`}
          </p>
        </div>
        <nav aria-label="Report range" className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.value}
              asChild
              size="sm"
              variant={activePreset === p.value ? "default" : "outline"}
              className="h-11 sm:h-9"
            >
              <Link
                href={
                  p.value === "month"
                    ? "/admin/reports"
                    : `/admin/reports?range=${p.value}`
                }
                aria-current={activePreset === p.value ? "page" : undefined}
              >
                {p.label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>

      <form
        action="/admin/reports"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface/50 px-4 py-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="report-from">From</Label>
          <Input
            id="report-from"
            name="from"
            type="date"
            defaultValue={from}
            required
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-to">To</Label>
          <Input
            id="report-to"
            name="to"
            type="date"
            defaultValue={to}
            required
            className="w-44"
          />
        </div>
        <Button type="submit" variant="outline">
          Show
        </Button>
        <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto sm:self-center">
          Up to {MAX_RANGE_DAYS} days. Amounts rounded to 5 tetri.
        </p>
      </form>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Net revenue"
          value={formatPriceRounded(totals.netRevenue)}
          detail={
            totals.commission > 0
              ? `${formatPriceRounded(totals.commission)} commission`
              : undefined
          }
        />
        <StatCard
          label="Expenses"
          value={formatPriceRounded(totals.expenses)}
        />
        <StatCard
          label="Profit"
          value={formatPriceRounded(totals.profit)}
          negative={totals.profit < 0}
        />
        <StatCard
          label="Occupancy"
          value={`${totals.occupancy}%`}
          detail={`${totals.occupiedRooms} of ${totals.activeRoomNights} room-nights`}
        />
        <StatCard
          label="Cash"
          value={formatPriceRounded(totals.cashReceived)}
        />
        <StatCard
          label="Card"
          value={formatPriceRounded(totals.cardReceived)}
        />
      </dl>

      {report.days.length > 1 && (
        <section
          aria-labelledby="chart-heading"
          className="rounded-xl border border-border bg-card px-4 py-5 sm:px-6"
        >
          <h2 id="chart-heading" className="mb-3 text-lg font-semibold">
            Per day
          </h2>
          <ReportChart days={report.days} />
        </section>
      )}

      <section aria-labelledby="table-heading" className="space-y-3">
        <h2 id="table-heading" className="text-lg font-semibold">
          Daily breakdown
        </h2>
        <ReportTable report={report} today={today} />
      </section>
    </div>
  );
}
