"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MotionConfig } from "motion/react";
import { BedDouble, ChevronDown, Loader2, Search, Users } from "lucide-react";
import { BookingConfirmation } from "@/components/book/booking-confirmation";
import { GuestForm } from "@/components/book/guest-form";
import { Step } from "@/components/book/step";
import { Stepper } from "@/components/book/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  createBooking,
  getAvailability,
  getQuote,
  humanizeApiMessage,
} from "@/lib/api";
import { addDays, toIsoDate } from "@/lib/dates";
import { formatDate, formatPrice } from "@/lib/format";
import { guestFields, guestSchema, type GuestValues } from "@/lib/guest-schema";
import { cn } from "@/lib/utils";
import type {
  Availability,
  AvailabilityQuery,
  Booking,
  Quote,
  QuoteQuery,
} from "@/lib/types";

export type SearchResult = { search: AvailabilityQuery } & (
  | { rooms: Availability[]; error?: undefined }
  | { rooms?: undefined; error: string }
);

type Props = {
  initialSearch: AvailabilityQuery;
  initialResult: SearchResult | null;
  maxGuests: number;
};

const NETWORK_ERROR = "We couldn't reach the hotel. Check your connection and try again.";

function scrollToStep(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  });
}

export function BookingFlow({ initialSearch, initialResult, maxGuests }: Props) {
  // Step 1 inputs; results always belong to result.search
  const [search, setSearch] = useState(initialSearch);
  const [result, setResult] = useState(initialResult);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Steps 2-3
  const [selected, setSelected] = useState<Availability | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [breakfast, setBreakfast] = useState(false);
  const [dinner, setDinner] = useState(false);

  // Step 4
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const form = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    mode: "onTouched",
    defaultValues: { firstName: "", lastName: "", phone: "", email: "", country: "" },
  });

  // Scroll after the target step has rendered; a new object re-triggers
  const [scrollTarget, setScrollTarget] = useState<{ id: string } | null>(null);
  useEffect(() => {
    if (scrollTarget) scrollToStep(scrollTarget.id);
  }, [scrollTarget]);

  const searched = result?.rooms ? result.search : null;

  // Quote: refetched whenever the room or options change; stale requests are aborted
  const quoteKey =
    selected && searched
      ? JSON.stringify({
          roomTypeId: selected.id,
          checkIn: searched.checkIn,
          checkOut: searched.checkOut,
          adults,
          children,
          breakfast,
          dinner,
        } satisfies QuoteQuery)
      : null;
  const [quoteState, setQuoteState] = useState<{
    key: string;
    quote?: Quote;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!quoteKey) return;
    const controller = new AbortController();
    getQuote(JSON.parse(quoteKey) as QuoteQuery, { signal: controller.signal }).then(
      (quote) => setQuoteState({ key: quoteKey, quote }),
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setQuoteState({
          key: quoteKey,
          error: err instanceof ApiError ? humanizeApiMessage(err.message) : NETWORK_ERROR,
        });
      },
    );
    return () => controller.abort();
  }, [quoteKey]);

  const quoteLoading = quoteKey !== null && quoteState?.key !== quoteKey;
  const quoteError = !quoteLoading ? quoteState?.error : undefined;
  // Keep showing the previous quote (dimmed) while the next one loads
  const quote = quoteState?.quote;
  const rates = quote?.breakdown;

  async function runSearch(query: AvailabilityQuery) {
    setSearching(true);
    try {
      const rooms = await getAvailability(query);
      setResult({ search: query, rooms });
      const params = new URLSearchParams({
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        guests: String(query.guests),
      });
      window.history.replaceState(null, "", `/book?${params}`);
    } catch (err) {
      setResult({
        search: query,
        error:
          err instanceof ApiError && err.status === 400
            ? humanizeApiMessage(err.message)
            : "We couldn't check availability. Please try again.",
      });
    } finally {
      setSearching(false);
    }
  }

  // Editing the search invalidates the results and the chosen room
  function updateSearch(patch: Partial<AvailabilityQuery>) {
    const next = { ...search, ...patch };
    if (patch.checkIn && next.checkOut && next.checkOut <= patch.checkIn) {
      next.checkOut = addDays(patch.checkIn, 1);
    }
    setSearch(next);
    setResult(null);
    setSelected(null);
    setNotice(null);
  }

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSelected(null);
    setNotice(null);
    await runSearch(search);
    setScrollTarget({ id: "step-room" });
  }

  function selectRoom(room: Availability) {
    if (!searched) return;
    setSelected(room);
    setAdults(Math.min(searched.guests, room.maxGuests));
    setChildren(0);
    setBreakfast(false);
    setDinner(false);
    setNotice(null);
    setSubmitError(null);
    setScrollTarget({ id: "step-options" });
  }

  async function handleBook(values: GuestValues) {
    if (!selected || !searched) return;
    setSubmitError(null);
    try {
      const created = await createBooking({
        roomTypeId: selected.id,
        checkIn: searched.checkIn,
        checkOut: searched.checkOut,
        adults,
        children,
        breakfast,
        dinner,
        guest: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          email: values.email || undefined,
          country: values.country || undefined,
        },
      });
      setBooking(created);
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setSubmitError(NETWORK_ERROR);
      } else if (err.status === 409) {
        setSelected(null);
        setNotice("This room was just booked, please choose another.");
        await runSearch(searched);
        setScrollTarget({ id: "step-room" });
      } else if (err.status === 429) {
        setSubmitError("Too many attempts. Please wait a few minutes and try again.");
      } else if (err.status === 400) {
        showApiErrors(err.message);
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    }
  }

  // The API returns all validation messages joined with "; "
  function showApiErrors(message: string) {
    const other: string[] = [];
    let focused = false;
    for (const part of message.split("; ")) {
      const field = guestFields.find((f) => part.startsWith(`${f} `));
      if (field) {
        form.setError(field, { message: humanizeApiMessage(part) }, { shouldFocus: !focused });
        focused = true;
      } else {
        other.push(humanizeApiMessage(part));
      }
    }
    if (other.length > 0) setSubmitError(other.join(". "));
  }

  if (booking) {
    return <BookingConfirmation booking={booking} />;
  }

  // Server and browser dates can differ around midnight; min is only a hint
  const today = toIsoDate(new Date());
  const people = adults + children;

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-h1 font-medium">Book your stay</h1>
          <p className="text-muted-foreground">
            Our best price, no booking fees. Pay at the hotel.
          </p>
        </div>

        {/* Step 1 */}
        <Step id="step-dates" number={1} title="Dates and guests">
          <form
            onSubmit={handleSearch}
            aria-label="Check availability"
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="book-check-in">Check-in</Label>
              <Input
                id="book-check-in"
                type="date"
                required
                min={today}
                value={search.checkIn}
                onChange={(e) => updateSearch({ checkIn: e.target.value })}
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-check-out">Check-out</Label>
              <Input
                id="book-check-out"
                type="date"
                required
                min={addDays(search.checkIn || today, 1)}
                value={search.checkOut}
                onChange={(e) => updateSearch({ checkOut: e.target.value })}
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="book-guests">Guests</Label>
              <div className="relative">
                <select
                  id="book-guests"
                  value={search.guests}
                  onChange={(e) => updateSearch({ guests: Number(e.target.value) })}
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
            <Button type="submit" size="lg" className="sm:col-span-2" disabled={searching}>
              {searching ? <Loader2 aria-hidden className="animate-spin" /> : <Search aria-hidden />}
              {searching ? "Checking…" : "Check availability"}
            </Button>
            {result?.error && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive sm:col-span-2"
              >
                {result.error}
              </p>
            )}
          </form>
        </Step>

        {/* Step 2 */}
        {result?.rooms && (
          <Step
            id="step-room"
            number={2}
            title="Choose a room"
            description={`${formatDate(result.search.checkIn)} – ${formatDate(result.search.checkOut)} · ${result.search.guests} ${result.search.guests === 1 ? "guest" : "guests"}`}
          >
            {notice && (
              <p role="alert" className="rounded-xl bg-accent/15 px-4 py-3 font-medium">
                {notice}
              </p>
            )}
            {result.rooms.length === 0 ? (
              <div className="rounded-xl bg-surface px-5 py-6">
                <p className="font-medium">Sorry, we have no free rooms for these dates.</p>
                <p className="mt-1 text-muted-foreground">
                  Please try other dates or fewer guests.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {result.rooms.map((room) => {
                  const isSelected = selected?.id === room.id;
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => selectRoom(room)}
                        className={cn(
                          "flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,box-shadow] duration-200 outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/40 sm:flex-row sm:items-center sm:justify-between sm:p-5",
                          isSelected
                            ? "border-primary ring-2 ring-primary/30 hover:border-primary"
                            : "border-border",
                        )}
                      >
                        <div className="space-y-1.5">
                          <p className="font-heading text-lg font-medium">{room.name}</p>
                          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <BedDouble className="size-4" aria-hidden />
                              {room.beds}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="size-4" aria-hidden />
                              Up to {room.maxGuests} guests
                            </span>
                          </p>
                        </div>
                        <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                          <p className="text-sm text-muted-foreground">
                            {room.nights} {room.nights === 1 ? "night" : "nights"} ·{" "}
                            {formatPrice(room.basePrice)} / night
                          </p>
                          <p className="text-xl font-semibold text-price">
                            {formatPrice(room.roomTotal)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex h-11 items-center justify-center rounded-full px-6 text-[0.9375rem] font-medium sm:hidden",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "border border-input",
                          )}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Step>
        )}

        {/* Step 3 */}
        {selected && searched && (
          <Step
            id="step-options"
            number={3}
            title="Guests and meals"
            description={`${selected.name} room, up to ${selected.maxGuests} guests`}
            animateIn
          >
            <div className="space-y-3">
              <Stepper
                id="adults"
                label="Adults"
                value={adults}
                min={1}
                max={selected.maxGuests - children}
                onChange={setAdults}
              />
              <Stepper
                id="children"
                label="Children"
                hint="Meals for children cost the same as for adults"
                value={children}
                min={0}
                max={selected.maxGuests - adults}
                onChange={setChildren}
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="mb-3 font-medium">Meals</legend>
              <MealOption
                label="Breakfast"
                rate={rates?.breakfastPerPersonPerNight}
                checked={breakfast}
                onChange={setBreakfast}
              />
              <MealOption
                label="Dinner"
                rate={rates?.dinnerPerPersonPerNight}
                checked={dinner}
                onChange={setDinner}
              />
            </fieldset>

            <div
              aria-live="polite"
              aria-busy={quoteLoading}
              className={cn(
                "rounded-xl bg-surface p-5 transition-opacity duration-200",
                quoteLoading && "opacity-60",
              )}
            >
              <h3 className="sr-only">Price summary</h3>
              {quoteError ? (
                <p role="alert" className="text-destructive">
                  {quoteError}
                </p>
              ) : quote ? (
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      Room · {quote.nights} {quote.nights === 1 ? "night" : "nights"} ×{" "}
                      {formatPrice(quote.breakdown.roomPerNight)}
                    </dt>
                    <dd>{formatPrice(quote.roomTotal)}</dd>
                  </div>
                  {quote.mealsTotal > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">
                        Meals · {people} {people === 1 ? "guest" : "guests"}
                      </dt>
                      <dd>{formatPrice(quote.mealsTotal)}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                    <dt className="font-medium">Total</dt>
                    <dd className="text-2xl font-semibold text-price">
                      {formatPrice(quote.totalPrice)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  Calculating price…
                </p>
              )}
            </div>
          </Step>
        )}

        {/* Step 4 */}
        {selected && searched && (
          <Step
            id="step-details"
            number={4}
            title="Your details"
            description="We'll use your phone to contact you about your stay."
            animateIn
          >
            <GuestForm
              form={form}
              onSubmit={handleBook}
              submitError={submitError}
              totalLabel={quote && !quoteLoading && !quoteError ? formatPrice(quote.totalPrice) : null}
            />
          </Step>
        )}
      </div>
    </MotionConfig>
  );
}

function MealOption({
  label,
  rate,
  checked,
  onChange,
}: {
  label: string;
  // undefined while loading, null when not offered
  rate: number | null | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const unavailable = rate === null;
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-colors duration-200 hover:border-foreground/30 has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
        unavailable && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={unavailable}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-primary outline-none"
      />
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">
        {unavailable
          ? "Not available"
          : rate !== undefined
            ? `${formatPrice(rate)} per person / night`
            : null}
      </span>
    </label>
  );
}
