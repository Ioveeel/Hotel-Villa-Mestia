import type {
  Admin,
  AdminBooking,
  AdminBookingPreview,
  AdminBookingPreviewInput,
  AdminRoom,
  ApiErrorBody,
  Availability,
  AvailabilityQuery,
  Booking,
  Calendar,
  CreateAdminBookingInput,
  CreateBookingInput,
  Quote,
  QuoteQuery,
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

const fieldLabels: Record<string, string> = {
  checkIn: "Check-in",
  checkOut: "Check-out",
  firstName: "First name",
  lastName: "Last name",
  roomTotal: "Booking.com amount",
  documentNumber: "Document number",
};

// API messages start with the field name ("checkIn cannot be in the past")
export function humanizeApiMessage(message: string): string {
  const text = message.replace(
    /\b(checkIn|checkOut|firstName|lastName|roomTotal|documentNumber)\b/g,
    (key) => fieldLabels[key],
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getRoomTypes(init?: RequestInit): Promise<RoomType[]> {
  return request("/room-types", init);
}

export function getAvailability(
  query: AvailabilityQuery,
  init?: RequestInit,
): Promise<Availability[]> {
  const params = new URLSearchParams({
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    guests: String(query.guests),
  });
  return request(`/availability?${params}`, init);
}

export function getQuote(query: QuoteQuery, init?: RequestInit): Promise<Quote> {
  const params = new URLSearchParams({
    roomTypeId: String(query.roomTypeId),
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    adults: String(query.adults),
    children: String(query.children),
    breakfast: String(query.breakfast),
    dinner: String(query.dinner),
  });
  return request(`/quote?${params}`, init);
}

export function createBooking(input: CreateBookingInput): Promise<Booking> {
  return request("/bookings", { method: "POST", body: JSON.stringify(input) });
}

export function login(email: string, password: string): Promise<Admin> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<void> {
  return request("/auth/logout", { method: "POST" });
}

// On the server, pass the session cookie in init.headers (see lib/admin-session.ts)
export function getMe(init?: RequestInit): Promise<Admin> {
  return request("/auth/me", init);
}

// Admin only: pass the session cookie in init.headers
export function getCalendar(
  query: { from: string; to: string },
  init?: RequestInit,
): Promise<Calendar> {
  const params = new URLSearchParams(query);
  return request(`/admin/calendar?${params}`, init);
}

// Admin only: pass the session cookie in init.headers
export function getAdminRooms(init?: RequestInit): Promise<AdminRoom[]> {
  return request("/admin/rooms", init);
}

// Admin only, from the browser (session cookie is sent automatically)
export function previewAdminBooking(
  input: AdminBookingPreviewInput,
  init?: RequestInit,
): Promise<AdminBookingPreview> {
  return request("/admin/bookings/preview", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createAdminBooking(
  input: CreateAdminBookingInput,
): Promise<AdminBooking> {
  return request("/admin/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
