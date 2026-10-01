import type { Metadata } from "next";
import { BookingFlow, type SearchResult } from "@/components/book/booking-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  ApiError,
  getAvailability,
  getRoomTypes,
  humanizeApiMessage,
} from "@/lib/api";
import { isIsoDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Book a room — Villa Mestia",
  description: "Check availability and book directly. Pay at the hotel.",
};

// Fallback when the API is unreachable; the API validates guests anyway
const DEFAULT_MAX_GUESTS = 4;
const DEFAULT_GUESTS = 2;

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function loadMaxGuests(): Promise<number> {
  try {
    const roomTypes = await getRoomTypes({ next: { revalidate: 300 } });
    return roomTypes.length
      ? Math.max(...roomTypes.map((rt) => rt.maxGuests))
      : DEFAULT_MAX_GUESTS;
  } catch (err) {
    console.error("Failed to load room types", err);
    return DEFAULT_MAX_GUESTS;
  }
}

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const query = await searchParams;
  const maxGuests = await loadMaxGuests();

  const checkIn = isIsoDate(param(query.checkIn)) ? param(query.checkIn) : "";
  const checkOut = isIsoDate(param(query.checkOut)) ? param(query.checkOut) : "";
  const guestsParam = Number(param(query.guests));
  const guests =
    Number.isInteger(guestsParam) && guestsParam >= 1 && guestsParam <= maxGuests
      ? guestsParam
      : Math.min(DEFAULT_GUESTS, maxGuests);

  const search = { checkIn, checkOut, guests };

  // Prefilled from the URL: search on the server so results show on first paint
  let initialResult: SearchResult | null = null;
  if (checkIn && checkOut) {
    try {
      const rooms = await getAvailability(search, { cache: "no-store" });
      initialResult = { search, rooms };
    } catch (err) {
      initialResult = {
        search,
        error:
          err instanceof ApiError && err.status === 400
            ? humanizeApiMessage(err.message)
            : "We couldn't check availability. Please try again.",
      };
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 sm:px-6 md:pt-12">
          <BookingFlow
            initialSearch={search}
            initialResult={initialResult}
            maxGuests={maxGuests}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
