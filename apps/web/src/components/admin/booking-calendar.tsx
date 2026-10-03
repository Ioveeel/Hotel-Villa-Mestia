import Link from "next/link";
import { Circle, CircleCheck, Plus } from "lucide-react";
import { addDays, daysBetween } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { BookingSource, Calendar, CalendarBooking } from "@/lib/types";
import { cn } from "@/lib/utils";

export const sourceStyles: Record<
  BookingSource,
  { label: string; className: string }
> = {
  website: { label: "Website", className: "bg-source-website" },
  booking_com: { label: "Booking.com", className: "bg-source-booking" },
  phone: { label: "Phone", className: "bg-source-phone" },
  walk_in: { label: "Walk-in", className: "bg-source-walk-in" },
};

const ROOM_COLUMN = "9rem";
const DAY_MIN_WIDTH = "2.75rem";

function dayParts(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
      date,
    );
  return {
    weekday: part({ weekday: "short" }),
    day: date.getUTCDate(),
    month: part({ month: "short" }),
    isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
  };
}

// Greedy lanes, so overlapping bars in one room (a cancelled booking
// and its replacement) don't cover each other. Active bookings first.
function assignLanes(bookings: CalendarBooking[]) {
  const sorted = [...bookings].sort(
    (a, b) =>
      Number(a.status === "cancelled") - Number(b.status === "cancelled") ||
      a.checkIn.localeCompare(b.checkIn),
  );
  const laneEnds: string[] = [];
  return sorted.map((booking) => {
    let lane = laneEnds.findIndex((end) => end <= booking.checkIn);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = booking.checkOut;
    return { booking, lane };
  });
}

function BookingBar({
  booking,
  lane,
  from,
  dayCount,
}: {
  booking: CalendarBooking;
  lane: number;
  from: string;
  dayCount: number;
}) {
  const start = Math.max(0, daysBetween(from, booking.checkIn));
  const end = Math.min(dayCount, daysBetween(from, booking.checkOut));
  const source = sourceStyles[booking.source];
  const cancelled = booking.status === "cancelled";
  const paid = booking.paidAt !== null;
  const name = `${booking.guestFirstName} ${booking.guestLastName}`;
  const PaidIcon = paid ? CircleCheck : Circle;

  return (
    <div
      title={[
        name,
        `${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)}`,
        source.label,
        booking.status.replace("_", " "),
        paid ? "Paid" : "Unpaid",
      ].join(" · ")}
      style={{ gridColumn: `${start + 1} / ${end + 1}`, gridRow: lane + 1 }}
      className={cn(
        "z-10 mx-0.5 my-1 flex min-w-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-bar-foreground shadow-sm shadow-foreground/10",
        source.className,
        booking.checkIn < from && "-ml-px rounded-l-none",
        daysBetween(from, booking.checkOut) > dayCount &&
          "-mr-px rounded-r-none",
        cancelled && "opacity-45 shadow-none",
      )}
    >
      <PaidIcon aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">{paid ? "Paid:" : "Unpaid:"}</span>
      <span className={cn("truncate", cancelled && "line-through")}>
        {name}
      </span>
      {cancelled && <span className="sr-only">(cancelled)</span>}
    </div>
  );
}

export function BookingCalendar({
  calendar,
  today,
}: {
  calendar: Calendar;
  today: string;
}) {
  const { from, to, rooms, bookings } = calendar;
  const dayCount = daysBetween(from, to);
  const days = Array.from({ length: dayCount }, (_, i) => addDays(from, i));
  const columns = `repeat(${dayCount}, minmax(0, 1fr))`;

  return (
    // Focusable so the horizontal scroll works from the keyboard
    <div
      role="region"
      aria-label="Room bookings by day"
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div
        style={{
          minWidth: `calc(${ROOM_COLUMN} + ${dayCount} * ${DAY_MIN_WIDTH})`,
        }}
      >
        <div className="flex border-b border-border">
          <div
            style={{ width: ROOM_COLUMN }}
            className="sticky left-0 z-20 flex shrink-0 items-end border-r border-border bg-card px-3 pb-2 text-xs font-medium text-muted-foreground"
          >
            Room
          </div>
          <div className="grid flex-1" style={{ gridTemplateColumns: columns }}>
            {days.map((day, i) => {
              const {
                weekday,
                day: dayNumber,
                month,
                isWeekend,
              } = dayParts(day);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "flex flex-col items-center border-l border-border/60 pt-1.5 pb-2 text-xs first:border-l-0",
                    isWeekend && "bg-surface/50",
                    isToday && "bg-glacier/30",
                  )}
                >
                  <span className="h-4 text-[0.6875rem] font-semibold text-price uppercase">
                    {(i === 0 || dayNumber === 1) && month}
                  </span>
                  <span className="text-muted-foreground">{weekday}</span>
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 items-center justify-center rounded-full font-medium tabular-nums",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {dayNumber}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.roomId === room.id);
          const lanes = assignLanes(roomBookings);
          const laneCount = Math.max(1, ...lanes.map((l) => l.lane + 1));
          return (
            <div
              key={room.id}
              className="flex border-b border-border last:border-b-0"
            >
              <div
                style={{ width: ROOM_COLUMN }}
                className={cn(
                  "sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-border bg-card px-3 py-1 text-sm",
                  !room.isActive && "text-muted-foreground",
                )}
              >
                <span className="truncate">
                  <span className="font-semibold">Room {room.number}</span>
                  {" · "}
                  {room.roomTypeName}
                </span>
                {!room.isActive && <span className="text-xs">Inactive</span>}
              </div>
              <div
                className="grid flex-1"
                style={{
                  gridTemplateColumns: columns,
                  gridTemplateRows: `repeat(${laneCount}, 2.5rem)`,
                }}
              >
                {days.map((day, i) => {
                  const className = cn(
                    "border-l border-border/60 first:border-l-0",
                    dayParts(day).isWeekend && "bg-surface/50",
                    day === today && "bg-glacier/30",
                    !room.isActive && "bg-surface",
                  );
                  const style = { gridColumn: i + 1, gridRow: "1 / -1" };
                  const free =
                    room.isActive &&
                    !roomBookings.some(
                      (b) =>
                        b.status !== "cancelled" &&
                        b.checkIn <= day &&
                        day < b.checkOut,
                    );
                  if (!free) {
                    return <div key={day} style={style} className={className} />;
                  }
                  // Out of the tab order (9 rooms × 31 days); keyboard users have the "New booking" button
                  return (
                    <Link
                      key={day}
                      href={`/admin/bookings/new?room=${room.id}&checkIn=${day}`}
                      tabIndex={-1}
                      aria-label={`New booking: Room ${room.number}, ${formatDate(day)}`}
                      style={style}
                      className={cn(
                        className,
                        "group flex items-center justify-center transition-colors duration-150 hover:bg-primary/10",
                      )}
                    >
                      <Plus
                        aria-hidden
                        className="size-4 text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    </Link>
                  );
                })}
                {lanes.map(({ booking, lane }) => (
                  <BookingBar
                    key={booking.id}
                    booking={booking}
                    lane={lane}
                    from={from}
                    dayCount={dayCount}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      {Object.values(sourceStyles).map(({ label, className }) => (
        <li key={label} className="flex items-center gap-2">
          <span aria-hidden className={cn("size-3 rounded-sm", className)} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <CircleCheck aria-hidden className="size-3.5" />
        Paid
      </li>
      <li className="flex items-center gap-2">
        <Circle aria-hidden className="size-3.5" />
        Unpaid
      </li>
      <li className="flex items-center gap-2">
        <span className="line-through opacity-60">Name</span>
        Cancelled
      </li>
    </ul>
  );
}
