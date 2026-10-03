import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewBookingForm } from "@/components/admin/new-booking-form";
import { requireAdmin, sessionHeaders } from "@/lib/admin-session";
import { getAdminRooms } from "@/lib/api";
import { addDays, hotelToday, isIsoDate } from "@/lib/dates";

export const metadata: Metadata = { title: "New booking" };

// ?room=5&checkIn=2026-10-08 prefills the form (from a calendar cell)
export default async function NewBookingPage({
  searchParams,
}: PageProps<"/admin/bookings/new">) {
  await requireAdmin();

  const today = hotelToday();
  const { room: roomParam, checkIn: checkInParam } = await searchParams;
  const rooms = (
    await getAdminRooms({ headers: await sessionHeaders(), cache: "no-store" })
  ).filter((room) => room.isActive);

  const initialRoomId =
    rooms.find((room) => String(room.id) === roomParam)?.id ?? null;
  // Round trip through addDays rejects dates like 2026-02-31
  const initialCheckIn =
    typeof checkInParam === "string" &&
    isIsoDate(checkInParam) &&
    addDays(checkInParam, 0) === checkInParam
      ? checkInParam
      : today;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin/calendar"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Calendar
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          New booking
        </h1>
      </div>
      <NewBookingForm
        rooms={rooms}
        today={today}
        initialRoomId={initialRoomId}
        initialCheckIn={initialCheckIn}
      />
    </div>
  );
}
