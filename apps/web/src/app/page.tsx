import Link from "next/link";
import { BadgePercent, Coffee, MapPin, Receipt, Soup, Wallet } from "lucide-react";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { PlaceholderPhoto } from "@/components/placeholder-photo";
import { Reveal } from "@/components/reveal";
import { RoomCard } from "@/components/room-card";
import { SearchForm } from "@/components/home/search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getRoomTypes } from "@/lib/api";
import type { RoomType } from "@/lib/types";

// Room types rarely change; refresh the cached page every 5 minutes
export const revalidate = 300;

// Fallback when the API is unreachable; the API validates guests anyway
const DEFAULT_MAX_GUESTS = 4;

async function loadRoomTypes(): Promise<RoomType[] | null> {
  try {
    return await getRoomTypes({ next: { revalidate } });
  } catch (err) {
    console.error("Failed to load room types", err);
    return null;
  }
}

const directBenefits = [
  {
    icon: BadgePercent,
    title: "Lower price",
    text: "Our own rates are lower than on booking sites.",
  },
  {
    icon: Receipt,
    title: "No extra fees",
    text: "The price you see is the price you pay. No booking or service fees.",
  },
  {
    icon: Wallet,
    title: "Pay at the hotel",
    text: "No prepayment. Pay on arrival, in cash or by card.",
  },
];

export default async function Home() {
  const roomTypes = await loadRoomTypes();
  const maxGuests = roomTypes?.length
    ? Math.max(...roomTypes.map((rt) => rt.maxGuests))
    : DEFAULT_MAX_GUESTS;

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-300 px-4 pt-10 sm:px-6 md:pt-16">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium tracking-wide text-price">
              Mestia, Svaneti
            </p>
            <h1 className="text-display font-medium">
              A family stone house in the heart of Svaneti
            </h1>
            <p className="max-w-prose text-lead text-muted-foreground">
              Nine warm rooms, home-cooked meals and views of the Caucasus.
              Book direct for our best price and pay when you arrive.
            </p>
          </div>

          <div className="mt-8 md:mt-12">
            <PlaceholderPhoto className="aspect-4/3 rounded-2xl sm:aspect-video lg:aspect-21/9" />
            <div className="relative z-10 -mt-12 px-2 sm:-mt-16 sm:px-6 lg:px-10">
              <SearchForm maxGuests={maxGuests} />
            </div>
          </div>
        </section>

        {/* Why book direct */}
        <section
          aria-labelledby="direct-heading"
          className="mx-auto w-full max-w-300 px-4 py-16 sm:px-6 md:py-24"
        >
          <Reveal className="grid gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
            <div className="space-y-3">
              <h2 id="direct-heading" className="text-h2 font-medium">
                Why book direct
              </h2>
              <p className="text-muted-foreground">
                Booking with us directly is simpler and cheaper.
              </p>
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {directBenefits.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4 py-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-sans text-lg font-semibold">{title}</h3>
                    <p className="text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* Rooms preview */}
        <section
          id="rooms"
          aria-labelledby="rooms-heading"
          className="scroll-mt-16 bg-surface/60 py-16 md:py-24"
        >
          <div className="mx-auto w-full max-w-300 px-4 sm:px-6">
            <Reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <h2 id="rooms-heading" className="text-h2 font-medium">
                  Our rooms
                </h2>
                <p className="max-w-prose text-muted-foreground">
                  Nine rooms for two to four guests. Prices are per room per
                  night.
                </p>
              </div>
              <Button asChild variant="outline" className="self-start sm:self-auto">
                <Link href="/book">Check availability</Link>
              </Button>
            </Reveal>

            {roomTypes?.length ? (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {roomTypes.map((rt, i) => (
                  <li key={rt.id}>
                    <Reveal delay={(i % 4) * 0.08} className="h-full">
                      <RoomCard
                        name={rt.name}
                        beds={rt.beds}
                        maxGuests={rt.maxGuests}
                        basePrice={rt.basePrice}
                        href={`/book?roomType=${encodeURIComponent(rt.slug)}`}
                      />
                    </Reveal>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
                Room details are unavailable right now. You can still{" "}
                <Link href="/book" className="text-primary underline underline-offset-4">
                  check availability
                </Link>
                .
              </p>
            )}
          </div>
        </section>

        {/* Meals */}
        {/* TODO: load meal prices from the API once an endpoint exists */}
        <section
          aria-labelledby="meals-heading"
          className="mx-auto w-full max-w-300 px-4 py-16 sm:px-6 md:py-24"
        >
          <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <PlaceholderPhoto className="aspect-4/3 rounded-2xl" />
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 id="meals-heading" className="text-h2 font-medium">
                  Breakfast &amp; dinner
                </h2>
                <p className="text-muted-foreground">
                  Home-cooked Svan and Georgian food, made in our kitchen. Add
                  meals when you book or at the hotel.
                </p>
              </div>
              <dl className="divide-y divide-border border-y border-border">
                <div className="flex items-center gap-4 py-4">
                  <Coffee className="size-5 text-primary" aria-hidden />
                  <dt className="flex-1 font-medium">Breakfast</dt>
                  <dd className="text-muted-foreground">
                    <span className="font-semibold text-price">20 ₾</span> per
                    person / night
                  </dd>
                </div>
                <div className="flex items-center gap-4 py-4">
                  <Soup className="size-5 text-primary" aria-hidden />
                  <dt className="flex-1 font-medium">Dinner</dt>
                  <dd className="text-muted-foreground">
                    <span className="font-semibold text-price">40 ₾</span> per
                    person / night
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </section>

        {/* Location */}
        <section
          id="about"
          aria-labelledby="about-heading"
          className="scroll-mt-16 bg-surface/60 py-16 md:py-24"
        >
          <Reveal className="mx-auto grid w-full max-w-300 items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
            <div className="space-y-4 md:order-last">
              <p className="flex items-center gap-2 text-sm font-medium tracking-wide text-price">
                <MapPin className="size-4" aria-hidden />
                Mestia, Svaneti, Georgia
              </p>
              <h2 id="about-heading" className="text-h2 font-medium">
                In the heart of Svaneti
              </h2>
              <p className="text-muted-foreground">
                Mestia sits high in the Greater Caucasus, surrounded by
                snow-capped peaks and medieval Svan towers. We are a small
                family hotel within walking distance of the town centre, a
                calm base for hiking, skiing and exploring the region.
              </p>
            </div>
            {/* Map placeholder until a real map is added */}
            <div
              role="img"
              aria-label="Map placeholder: Mestia, Svaneti"
              className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-2xl border border-border bg-glacier/40 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[40px_40px]"
            >
              <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium shadow-sm">
                <MapPin className="size-4 text-accent" aria-hidden />
                Mestia
              </span>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
      <MobileBookBar />
    </>
  );
}
