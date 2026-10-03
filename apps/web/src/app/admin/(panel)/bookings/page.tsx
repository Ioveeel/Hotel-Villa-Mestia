import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  Plus,
} from "lucide-react";
import { sourceStyles } from "@/components/admin/booking-calendar";
import { SourceBadge, StatusBadge } from "@/components/admin/booking-badges";
import { BookingFilters } from "@/components/admin/booking-filters";
import { BookingLink, BookingRow } from "@/components/admin/booking-link";
import { BookingPanel } from "@/components/admin/booking-panel";
import { Button } from "@/components/ui/button";
import { requireAdmin, sessionHeaders } from "@/lib/admin-session";
import { getAdminBookings } from "@/lib/api";
import { addDays, isIsoDate } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import type {
  AdminBookingListItem,
  AdminBookingListQuery,
  BookingSource,
  BookingStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Bookings" };

const PAGE_SIZE = 25;
// Same limit as GET /admin/bookings
const MAX_PAGE = 100_000;

const statuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
];

type Params = Record<string, string | string[] | undefined>;

function param(params: Params, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

// Round trip through addDays rejects dates like 2026-02-31
function validDate(value: string | undefined): string | undefined {
  return value && isIsoDate(value) && addDays(value, 0) === value
    ? value
    : undefined;
}

// Invalid values in the URL are ignored rather than shown as an error
function parseQuery(params: Params): AdminBookingListQuery {
  const q = param(params, "q")?.trim().slice(0, 100);
  const status = param(params, "status");
  const source = param(params, "source");
  const paid = param(params, "paid");
  const from = validDate(param(params, "from"));
  let to = validDate(param(params, "to"));
  if (from && to && to < from) to = undefined;
  const page = Number(param(params, "page"));
  return {
    q: q || undefined,
    status: statuses.includes(status as BookingStatus)
      ? (status as BookingStatus)
      : undefined,
    source:
      source && source in sourceStyles ? (source as BookingSource) : undefined,
    paid: paid === "true" ? true : paid === "false" ? false : undefined,
    from,
    to,
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
    pageSize: PAGE_SIZE,
  };
}

// "2026-10-08" -> "8 Oct 2026"
function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export default async function BookingsPage({
  searchParams,
}: PageProps<"/admin/bookings">) {
  await requireAdmin();

  const params = await searchParams;
  const query = parseQuery(params);
  const list = await getAdminBookings(query, {
    headers: await sessionHeaders(),
    cache: "no-store",
  });

  // Current URL params (without the panel), for row and page links
  const base = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && key !== "booking") base.set(key, value);
  }
  const withParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(base);
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    return `?${next}`;
  };
  const bookingHref = (id: number) => withParams({ booking: String(id) });

  const pageCount = Math.max(1, Math.ceil(list.total / list.pageSize));
  const { q, status, source, paid, from, to } = query;
  const filtered = [q, status, source, paid, from, to].some(
    (v) => v !== undefined,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {list.total === 1 ? "1 booking" : `${list.total} bookings`}
            {filtered && " found"}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/bookings/new">
            <Plus aria-hidden />
            New booking
          </Link>
        </Button>
      </div>

      <BookingFilters />

      {list.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <p className="font-medium">No bookings found.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? "Try a different search or clear the filters."
              : "New bookings will appear here."}
          </p>
        </div>
      ) : (
        <>
          <BookingTable items={list.items} hrefFor={bookingHref} />
          <BookingCards items={list.items} hrefFor={bookingHref} />
        </>
      )}

      {(list.total > list.pageSize || list.page > 1) && (
        <Pagination
          page={list.page}
          pageCount={pageCount}
          total={list.total}
          pageSize={list.pageSize}
          hrefFor={(page) => withParams({ page: String(page) })}
        />
      )}

      <BookingPanel />
    </div>
  );
}

function Paid({ booking }: { booking: AdminBookingListItem }) {
  if (booking.paidAt) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-primary">
        <CircleCheck aria-hidden className="size-4" />
        Paid
        {booking.paymentMethod && (
          <span className="text-muted-foreground">
            · {booking.paymentMethod === "cash" ? "cash" : "card"}
          </span>
        )}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        booking.status === "cancelled" ? "text-muted-foreground" : "text-price",
      )}
    >
      <Circle aria-hidden className="size-4" />
      Unpaid
    </span>
  );
}

const cell = "px-4 py-3 whitespace-nowrap";

function BookingTable({
  items,
  hrefFor,
}: {
  items: AdminBookingListItem[];
  hrefFor: (id: number) => string;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Bookings, newest check-in first. Select a booking to open its details.
        </caption>
        <thead className="border-b border-border bg-surface/50 text-left text-muted-foreground">
          <tr>
            <th scope="col" className={cn(cell, "font-medium")}>
              No.
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Guest
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Room
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Dates
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Source
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Status
            </th>
            <th scope="col" className={cn(cell, "text-right font-medium")}>
              Total
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Payment
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((b) => {
            const cancelled = b.status === "cancelled";
            return (
              <BookingRow
                key={b.id}
                href={hrefFor(b.id)}
                className="cursor-pointer transition-colors duration-150 hover:bg-surface/40"
              >
                <td className={cell}>
                  <BookingLink
                    href={hrefFor(b.id)}
                    aria-label={`Open booking #${b.id}, ${b.guestName}`}
                    className="rounded-sm font-medium text-primary tabular-nums underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    #{b.id}
                  </BookingLink>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "block max-w-48 truncate font-medium",
                      cancelled && "text-muted-foreground line-through",
                    )}
                  >
                    {b.guestName}
                  </span>
                  <span className="block text-muted-foreground tabular-nums">
                    {b.phone ?? "—"}
                  </span>
                </td>
                <td className={cell}>
                  <span className="font-medium">Room {b.roomNumber}</span>
                  <span className="block text-muted-foreground">
                    {b.roomTypeName}
                  </span>
                </td>
                <td className={cell}>
                  {shortDate(b.checkIn)} → {shortDate(b.checkOut)}
                  <span className="block text-muted-foreground">
                    {b.nights} {b.nights === 1 ? "night" : "nights"}
                  </span>
                </td>
                <td className={cell}>
                  <SourceBadge source={b.source} />
                </td>
                <td className={cell}>
                  <StatusBadge status={b.status} />
                </td>
                <td className={cn(cell, "text-right font-medium tabular-nums")}>
                  {formatPrice(b.totalPrice)}
                </td>
                <td className={cell}>
                  <Paid booking={b} />
                </td>
              </BookingRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BookingCards({
  items,
  hrefFor,
}: {
  items: AdminBookingListItem[];
  hrefFor: (id: number) => string;
}) {
  return (
    <ul className="space-y-3 md:hidden">
      {items.map((b) => {
        const cancelled = b.status === "cancelled";
        return (
          <li key={b.id}>
            <BookingLink
              href={hrefFor(b.id)}
              className="block space-y-3 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:bg-surface/40 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate font-medium",
                      cancelled && "text-muted-foreground line-through",
                    )}
                  >
                    {b.guestName}
                  </span>
                  <span className="block text-sm text-muted-foreground tabular-nums">
                    #{b.id} · {b.phone ?? "No phone"}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatPrice(b.totalPrice)}
                </span>
              </span>
              <span className="block text-sm">
                <span className="font-medium">Room {b.roomNumber}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {b.roomTypeName}
                </span>
                <span className="block">
                  {shortDate(b.checkIn)} → {shortDate(b.checkOut)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {b.nights} {b.nights === 1 ? "night" : "nights"}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <SourceBadge source={b.source} />
                <StatusBadge status={b.status} />
                <span className="ml-auto">
                  <Paid booking={b} />
                </span>
              </span>
            </BookingLink>
          </li>
        );
      })}
    </ul>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {first > total
          ? `Page ${page} of ${pageCount}`
          : `${first}–${last} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <PageLink
          href={hrefFor(Math.min(page - 1, pageCount))}
          disabled={page <= 1}
          label="Previous page"
        >
          <ChevronLeft aria-hidden />
          Previous
        </PageLink>
        <span className="px-2 text-sm tabular-nums">
          {Math.min(page, pageCount)} / {pageCount}
        </span>
        <PageLink
          href={hrefFor(page + 1)}
          disabled={page >= pageCount}
          label="Next page"
        >
          Next
          <ChevronRight aria-hidden />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline">
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
