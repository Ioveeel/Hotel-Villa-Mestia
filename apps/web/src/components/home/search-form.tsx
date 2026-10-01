"use client";

import { useState } from "react";
import Form from "next/form";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Local date as YYYY-MM-DD
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
}

export function SearchForm({ maxGuests }: { maxGuests: number }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // Server and browser dates can differ around midnight; min is only a hint
  const today = toIsoDate(new Date());
  const minCheckOut = addDays(checkIn || today, 1);

  function handleCheckIn(value: string) {
    setCheckIn(value);
    if (value && checkOut && checkOut <= value) setCheckOut(addDays(value, 1));
  }

  return (
    <Form
      action="/book"
      aria-label="Check availability"
      className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-lg shadow-foreground/8 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_0.8fr_auto] lg:items-end"
    >
      <div className="space-y-2">
        <Label htmlFor="search-check-in">Check-in</Label>
        <Input
          id="search-check-in"
          name="checkIn"
          type="date"
          required
          min={today}
          value={checkIn}
          onChange={(e) => handleCheckIn(e.target.value)}
          suppressHydrationWarning
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="search-check-out">Check-out</Label>
        <Input
          id="search-check-out"
          name="checkOut"
          type="date"
          required
          min={minCheckOut}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          suppressHydrationWarning
        />
      </div>

      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="search-guests">Guests</Label>
        <div className="relative">
          <select
            id="search-guests"
            name="guests"
            defaultValue="2"
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card pr-10 pl-4 text-base text-foreground transition-[border-color,box-shadow] duration-200 outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
        <Search aria-hidden />
        Check availability
      </Button>
    </Form>
  );
}
