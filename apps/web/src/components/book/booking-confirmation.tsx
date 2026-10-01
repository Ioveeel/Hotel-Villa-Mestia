"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/format";
import type { Booking } from "@/lib/types";

function mealsLabel(booking: Booking): string {
  if (booking.breakfast && booking.dinner) return "Breakfast and dinner";
  if (booking.breakfast) return "Breakfast";
  if (booking.dinner) return "Dinner";
  return "No meals";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function BookingConfirmation({ booking }: { booking: Booking }) {
  const adults = plural(booking.adults, "adult", "adults");
  const guests =
    booking.children > 0
      ? `${adults}, ${plural(booking.children, "child", "children")}`
      : adults;

  const rows: [string, string][] = [
    ["Booking number", `#${booking.id}`],
    ["Room", `${booking.roomTypeName}, room ${booking.roomNumber}`],
    ["Check-in", formatDate(booking.checkIn)],
    ["Check-out", formatDate(booking.checkOut)],
    ["Nights", String(booking.nights)],
    ["Guests", guests],
    ["Meals", mealsLabel(booking)],
    ["Room price", formatPrice(booking.roomTotal)],
  ];
  if (booking.mealsTotal > 0) rows.push(["Meals price", formatPrice(booking.mealsTotal)]);

  return (
    <section aria-labelledby="confirmation-title" className="space-y-6">
      <div className="space-y-3">
        <CircleCheck aria-hidden className="size-10 text-primary" />
        <h1 id="confirmation-title" className="text-h1 font-medium">
          Your room is booked
        </h1>
        <p className="text-lead text-muted-foreground">
          Thank you, we look forward to welcoming you in Mestia.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <dl className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-3 first:pt-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 pt-4">
            <dt className="font-medium">Total</dt>
            <dd className="text-2xl font-semibold text-price">
              {formatPrice(booking.totalPrice)}
            </dd>
          </div>
        </dl>
      </div>

      <p className="rounded-xl bg-surface px-4 py-3">
        <strong className="font-semibold">Pay at the hotel.</strong> No prepayment
        needed: pay on arrival, in cash or by card.
      </p>

      <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
        <Link href="/">Back to home</Link>
      </Button>
    </section>
  );
}
