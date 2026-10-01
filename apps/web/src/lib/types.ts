// Mirrors apps/api responses. All money values are in tetri.

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

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

export type ApiErrorBody = { error: string };
