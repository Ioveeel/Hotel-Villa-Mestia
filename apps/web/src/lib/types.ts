// Mirrors apps/api responses. All money values are in tetri.

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export type BookingSource = "website" | "booking_com" | "phone" | "walk_in";

export type PaymentMethod = "cash" | "card";

// GET /room-types
export type RoomType = {
  id: number;
  name: string;
  slug: string;
  description: string;
  beds: string;
  maxGuests: number;
  basePrice: number;
  activeRooms: number;
};

// GET /availability
export type Availability = {
  id: number;
  name: string;
  slug: string;
  beds: string;
  maxGuests: number;
  basePrice: number;
  availableRooms: number;
  nights: number;
  roomTotal: number;
};

export type AvailabilityQuery = {
  checkIn: string;
  checkOut: string;
  guests: number;
};

// GET /quote
export type QuoteQuery = {
  roomTypeId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  breakfast: boolean;
  dinner: boolean;
};

export type Quote = {
  nights: number;
  roomTotal: number;
  mealsTotal: number;
  totalPrice: number;
  breakdown: {
    roomPerNight: number;
    // null when the meal is not offered
    breakfastPerPersonPerNight: number | null;
    dinnerPerPersonPerNight: number | null;
  };
};

// POST /bookings request
export type CreateBookingInput = {
  roomTypeId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  breakfast?: boolean;
  dinner?: boolean;
  guest: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    country?: string;
  };
};

// POST /bookings response
export type Booking = {
  id: number;
  roomNumber: number;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  breakfast: boolean;
  dinner: boolean;
  roomTotal: number;
  mealsTotal: number;
  totalPrice: number;
  status: BookingStatus;
};

// POST /auth/login, GET /auth/me
export type Admin = {
  id: number;
  email: string;
  name: string | null;
};

// GET /admin/calendar. Range is [from, to); includes cancelled bookings.
export type CalendarRoom = {
  id: number;
  number: number;
  roomTypeName: string;
  isActive: boolean;
};

export type CalendarBooking = {
  id: number;
  roomId: number;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  source: BookingSource;
  guestFirstName: string;
  guestLastName: string;
  adults: number;
  children: number;
  breakfast: boolean;
  dinner: boolean;
  totalPrice: number;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
};

export type Calendar = {
  from: string;
  to: string;
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
};

export type ApiErrorBody = { error: string };
