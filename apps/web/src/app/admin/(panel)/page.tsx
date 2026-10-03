import type { Metadata } from "next";
import Link from "next/link";
import { BookingPanel } from "@/components/admin/booking-panel";
import { sourceStyles } from "@/components/admin/booking-calendar";
import { LogoutButton } from "@/components/admin/logout-button";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin, sessionHeaders } from "@/lib/admin-session";
import { getCalendar, getReport } from "@/lib/api";
import { addDays, hotelToday } from "@/lib/dates";
import { formatDate, formatPrice, formatPriceRounded } from "@/lib/format";
import type { CalendarBooking } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Today" };

export default async function AdminHomePage() {
  const admin = await requireAdmin();

  const today = hotelToday();
  const init = { headers: await sessionHeaders(), cache: "no-store" } as const;
  // Calendar range [today - 1, today + 1) includes bookings that check out today
  const [report, calendar] = await Promise.all([
    getReport({ from: today, to: today }, init),
    getCalendar({ from: addDays(today, -1), to: addDays(today, 1) }, init),
  ]);
  const day = report.days[0]!;

  const roomNumbers = new Map(calendar.rooms.map((r) => [r.id, r.number]));
  const active = calendar.bookings.filter((b) => b.status !== "cancelled");
  const byRoom = (a: CalendarBooking, b: CalendarBooking) =>
    (roomNumbers.get(a.roomId) ?? 0) - (roomNumbers.get(b.roomId) ?? 0);
  const arrivals = active.filter((b) => b.checkIn === today).sort(byRoom);
  const departures = active.filter((b) => b.checkOut === today).sort(byRoom);
  const inHouse = active
    .filter((b) => b.checkIn < today && b.checkOut > today)
    .sort(byRoom);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Today
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(today)} · {admin.name ?? admin.email}
          </p>
        </div>
        <LogoutButton />
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Breakfasts this morning"
          value={day.breakfastGuests}
          detail="08:00–10:00"
        />
        <StatCard
          label="Dinners this evening"
          value={day.dinnerGuests}
          detail="19:00–20:00"
        />
        <StatCard
          label="Net revenue"
          value={formatPriceRounded(day.netRevenue)}
          detail={`${day.occupiedRooms} of ${day.activeRooms} rooms tonight`}
        />
        <StatCard label="Expenses" value={formatPriceRounded(day.expenses)} />
        <StatCard
          label="Profit"
          value={formatPriceRounded(day.profit)}
          negative={day.profit < 0}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <GuestList
          title="Arrivals"
          empty="No arrivals today."
          hint="Check-in from 14:00"
          bookings={arrivals}
          roomNumbers={roomNumbers}
        />
        <GuestList
          title="Departures"
          empty="No departures today."
          hint="Check-out until 12:00"
          bookings={departures}
          roomNumbers={roomNumbers}
        />
        <GuestList
          title="In-house"
          empty="No other guests staying."
          hint="Staying on tonight"
          bookings={inHouse}
          roomNumbers={roomNumbers}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        <Link
          href="/admin/reports"
          className="rounded-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Open reports
        </Link>{" "}
        for other days.
      </p>

      <BookingPanel />
    </div>
  );
}

function GuestList({
  title,
  hint,
  empty,
  bookings,
  roomNumbers,
}: {
  title: string;
  hint: string;
  empty: string;
  bookings: CalendarBooking[];
  roomNumbers: Map<number, number>;
}) {
  const id = `list-${title.toLowerCase()}`;
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-border bg-surface/50 px-5 py-3">
        <h2 id={id} className="font-medium">
          {title}
          <span className="ml-2 text-muted-foreground tabular-nums">
            {bookings.length}
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {bookings.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {bookings.map((b) => {
            const guests = b.adults + b.children;
            const meals = [b.breakfast && "breakfast", b.dinner && "dinner"]
              .filter(Boolean)
              .join(" + ");
            return (
              <li key={b.id}>
                <Link
                  href={`?booking=${b.id}`}
                  scroll={false}
                  className="flex min-h-11 items-start gap-3 px-5 py-3 transition-colors duration-200 hover:bg-surface/40 focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span className="w-8 shrink-0 font-heading text-lg font-semibold tabular-nums">
                    {roomNumbers.get(b.roomId)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {b.guestFirstName} {b.guestLastName}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          sourceStyles[b.source].className,
                        )}
                      />
                      {sourceStyles[b.source].label} · {guests}{" "}
                      {guests === 1 ? "guest" : "guests"}
                      {meals && ` · ${meals}`}
                    </span>
                  </span>
                  {b.paidAt ? (
                    <Badge variant="secondary" className="mt-0.5">
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="accent" className="mt-0.5 tabular-nums">
                      {formatPrice(b.totalPrice)} due
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
