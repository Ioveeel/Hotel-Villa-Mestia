import type {
  ApiErrorBody,
  Availability,
  AvailabilityQuery,
  Booking,
  CreateBookingInput,
  RoomType,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Server calls the API directly; the browser goes through the /api rewrite
function baseUrl(): string {
  if (typeof window !== "undefined") return "/api";
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL is not set");
  return url;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body?.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function getRoomTypes(): Promise<RoomType[]> {
  return request("/room-types");
}

export function getAvailability(query: AvailabilityQuery): Promise<Availability[]> {
  const params = new URLSearchParams({
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    guests: String(query.guests),
  });
  return request(`/availability?${params}`);
}

export function createBooking(input: CreateBookingInput): Promise<Booking> {
  return request("/bookings", { method: "POST", body: JSON.stringify(input) });
}
