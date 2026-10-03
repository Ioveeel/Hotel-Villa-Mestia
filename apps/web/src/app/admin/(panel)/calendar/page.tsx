import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  BookingCalendar,
  CalendarLegend,
} from "@/components/admin/booking-calendar";
import { Button } from "@/components/ui/button";
import { requireAdmin, sessionHeaders } from "@/lib/admin-session";
import { getCalendar } from "@/lib/api";
import { addDays, hotelToday, isIsoDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Calendar" };

const DAYS_BEFORE_TODAY = 3;
const DAYS_SHOWN = 31;
const STEP_DAYS = 14;

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export default async function CalendarPage({
  searchParams,
}: PageProps<"/admin/calendar">) {
  await requireAdmin();

  const today = hotelToday();
  const { from: fromParam } = await searchParams;
  // Round trip through addDays rejects dates like 2026-02-31
  const from =
    typeof fromParam === "string" &&
    isIsoDate(fromParam) &&
    addDays(fromParam, 0) === fromParam
      ? fromParam
      : addDays(today, -DAYS_BEFORE_TODAY);
  const to = addDays(from, DAYS_SHOWN);

  const calendar = await getCalendar(
    { from, to },
    { headers: await sessionHeaders(), cache: "no-store" },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {shortDate(from)} – {shortDate(addDays(to, -1))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/admin/bookings/new">
              <Plus aria-hidden />
              New booking
            </Link>
          </Button>
          <nav aria-label="Calendar range" className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon">
              <Link
                href={`/admin/calendar?from=${addDays(from, -STEP_DAYS)}`}
                aria-label="Previous 2 weeks"
              >
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/calendar">Today</Link>
            </Button>
            <Button asChild variant="outline" size="icon">
              <Link
                href={`/admin/calendar?from=${addDays(from, STEP_DAYS)}`}
                aria-label="Next 2 weeks"
              >
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          </nav>
        </div>
      </div>

      <CalendarLegend />
      <BookingCalendar calendar={calendar} today={today} />
    </div>
  );
}
