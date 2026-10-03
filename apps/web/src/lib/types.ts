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

// GET /admin/rooms
export type AdminRoom = {
  id: number;
  number: number;
  roomTypeName: string;
  maxGuests: number;
  isActive: boolean;
};

export type AdminBookingSource = Exclude<BookingSource, "website">;

// POST /admin/bookings/preview request (POST /admin/bookings adds guest)
export type AdminBookingPreviewInput = {
  source: AdminBookingSource;
  roomId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  breakfast: boolean;
  dinner: boolean;
  notes?: string;
  // Required for booking_com, ignored otherwise
  roomTotal?: number;
};

export type CreateAdminBookingInput = AdminBookingPreviewInput & {
  guest: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    country?: string;
    documentNumber?: string;
  };
};

// POST /admin/bookings/preview response
export type AdminBookingPreview = {
  nights: number;
  roomTotal: number;
  mealsTotal: number;
  totalPrice: number;
  // Basis points (23% = 2300)
  commissionRate: number;
  commissionAmount: number;
  netTotal: number;
};

// POST /admin/bookings response (fields used by the web)
export type AdminBooking = {
  id: number;
  roomId: number;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  source: BookingSource;
  totalPrice: number;
};

// GET /admin/bookings/:id (also returned by pay, unpay, cancel). Admin only.
export type AdminGuest = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  documentNumber: string | null;
  notes: string | null;
};

export type AdminBookingDetails = {
  id: number;
  roomId: number;
  guestId: number;
  roomNumber: number;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: BookingStatus;
  source: BookingSource;
  externalRef: string | null;
  breakfast: boolean;
  dinner: boolean;
  roomPricePerNight: number | null;
  breakfastPrice: number;
  dinnerPrice: number;
  // Basis points (23% = 2300)
  commissionRateBp: number;
  roomTotal: number;
  mealsTotal: number;
  totalPrice: number;
  commissionAmount: number;
  netTotal: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  guest: AdminGuest;
};

export type ExpenseCategory =
  | "food"
  | "utilities"
  | "salaries"
  | "maintenance"
  | "supplies"
  | "taxes"
  | "other";

// GET /admin/expenses (also returned by POST and PATCH). Admin only.
export type Expense = {
  id: number;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

// GET /admin/expenses. Range is inclusive: [from, to].
export type ExpenseList = {
  from: string;
  to: string;
  total: number;
  totalsByCategory: { category: ExpenseCategory; total: number }[];
  // Newest first
  expenses: Expense[];
};

export type CreateExpenseInput = {
  date: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
};

// null clears the description
export type UpdateExpenseInput = Partial<
  Omit<CreateExpenseInput, "description"> & { description: string | null }
>;

// GET /admin/reports. Range is inclusive: [from, to]. Exact amounts in tetri.
export type ReportDay = {
  date: string;
  occupiedRooms: number;
  activeRooms: number;
  // Percent, one decimal
  occupancy: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  expenses: number;
  profit: number;
  cashReceived: number;
  cardReceived: number;
  breakfastGuests: number;
  dinnerGuests: number;
};

export type ReportTotals = Omit<ReportDay, "date" | "activeRooms"> & {
  // Room-nights available in the range
  activeRoomNights: number;
};

export type Report = {
  from: string;
  to: string;
  days: ReportDay[];
  totals: ReportTotals;
};
