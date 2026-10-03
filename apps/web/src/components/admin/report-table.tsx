import { formatReportAmount } from "@/lib/format";
import type { Report } from "@/lib/types";
import { cn } from "@/lib/utils";

// "2026-10-08" -> "Thu 8 Oct"
function tableDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

const num = "px-4 py-2.5 text-right tabular-nums whitespace-nowrap";

export function ReportTable({
  report,
  today,
}: {
  report: Report;
  today: string;
}) {
  const { days, totals } = report;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">
          Daily report. Amounts rounded to 5 tetri.
        </caption>
        <thead className="border-b border-border bg-surface/50 text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Date
            </th>
            <th scope="col" className={cn(num, "py-3 font-medium")}>
              Occupancy
            </th>
            <th scope="col" className={cn(num, "py-3 font-medium")}>
              Net revenue
            </th>
            <th scope="col" className={cn(num, "py-3 font-medium")}>
              Expenses
            </th>
            <th scope="col" className={cn(num, "py-3 font-medium")}>
              Profit
            </th>
            <th scope="col" className={cn(num, "py-3 font-medium")}>
              Cash
            </th>
            <th scope="col" className={cn(num, "py-3 font-medium")}>
              Card
            </th>
            <th scope="col" className={cn(num, "py-3 font-medium")}>
              Breakfasts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {days.map((day) => {
            const loss = day.profit < 0;
            return (
              <tr
                key={day.date}
                className={cn(loss && "bg-destructive/5")}
                aria-current={day.date === today ? "date" : undefined}
              >
                <th
                  scope="row"
                  className={cn(
                    "px-4 py-2.5 text-left font-normal whitespace-nowrap",
                    day.date === today && "font-semibold",
                  )}
                >
                  {tableDate(day.date)}
                </th>
                <td className={num}>
                  {day.occupiedRooms}/{day.activeRooms}
                  <span className="ml-2 inline-block w-12 text-muted-foreground">
                    {day.occupancy}%
                  </span>
                </td>
                <td className={num}>{formatReportAmount(day.netRevenue)}</td>
                <td className={num}>{formatReportAmount(day.expenses)}</td>
                <td
                  className={cn(num, loss && "font-semibold text-destructive")}
                >
                  {formatReportAmount(day.profit)}
                </td>
                <td className={num}>{formatReportAmount(day.cashReceived)}</td>
                <td className={num}>{formatReportAmount(day.cardReceived)}</td>
                <td className={num}>{day.breakfastGuests}</td>
              </tr>
            );
          })}
        </tbody>
        {days.length > 1 && (
          <tfoot className="border-t-2 border-border font-semibold">
            <tr>
              <th scope="row" className="px-4 py-3 text-left">
                Total
              </th>
              <td className={num}>{totals.occupancy}%</td>
              <td className={num}>{formatReportAmount(totals.netRevenue)}</td>
              <td className={num}>{formatReportAmount(totals.expenses)}</td>
              <td className={cn(num, totals.profit < 0 && "text-destructive")}>
                {formatReportAmount(totals.profit)}
              </td>
              <td className={num}>{formatReportAmount(totals.cashReceived)}</td>
              <td className={num}>{formatReportAmount(totals.cardReceived)}</td>
              <td className={num}>{totals.breakfastGuests}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
