import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildReport, splitEvenly, type ReportBooking } from "./reports.js";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const booking = (overrides: Partial<ReportBooking> = {}): ReportBooking => ({
  roomId: 1,
  checkIn: "2026-03-10",
  checkOut: "2026-03-13",
  adults: 2,
  children: 0,
  breakfast: false,
  dinner: false,
  totalPrice: 0,
  netTotal: 0,
  ...overrides,
});

const report = (input: Partial<Parameters<typeof buildReport>[0]>) =>
  buildReport({
    from: "2026-03-10",
    to: "2026-03-12",
    activeRooms: 9,
    bookings: [],
    payments: [],
    expenses: [],
    ...input,
  });

describe("splitEvenly", () => {
  test("1000 GEL over 3 nights sums exactly, remainder to first nights", () => {
    const parts = splitEvenly(100_000, 3);
    assert.deepEqual(parts, [33_334, 33_333, 33_333]);
    assert.equal(sum(parts), 100_000);
  });

  test("remainder of 2 goes to the first two nights", () => {
    assert.deepEqual(splitEvenly(101, 3), [34, 34, 33]);
  });

  test("1 night gets everything", () => {
    assert.deepEqual(splitEvenly(12_345, 1), [12_345]);
  });

  test("zero total", () => {
    assert.deepEqual(splitEvenly(0, 2), [0, 0]);
  });

  test("always sums exactly", () => {
    for (let total = 0; total < 500; total += 7) {
      for (let parts = 1; parts <= 30; parts++) {
        assert.equal(sum(splitEvenly(total, parts)), total);
      }
    }
  });

  test("rejects invalid input", () => {
    assert.throws(() => splitEvenly(10, 0));
    assert.throws(() => splitEvenly(10.5, 2));
    assert.throws(() => splitEvenly(-1, 2));
  });
});

describe("buildReport", () => {
  test("1000 GEL over 3 nights: per-night revenue sums to net_total", () => {
    const { days, totals } = report({
      bookings: [booking({ totalPrice: 100_000, netTotal: 100_000 })],
    });
    assert.deepEqual(
      days.map((d) => d.netRevenue),
      [33_334, 33_333, 33_333],
    );
    assert.equal(totals.netRevenue, 100_000);
    assert.equal(totals.grossRevenue, 100_000);
    assert.equal(totals.commission, 0);
  });

  test("commission per night sums exactly and is never negative", () => {
    // 1000 GEL Booking.com, 23% commission on 1000 = 230 GEL
    const { days, totals } = report({
      bookings: [booking({ totalPrice: 100_000, netTotal: 77_000 })],
    });
    assert.equal(totals.commission, 23_000);
    assert.equal(totals.netRevenue, 77_000);
    for (const d of days) {
      assert.ok(d.commission >= 0);
      assert.equal(d.grossRevenue - d.commission, d.netRevenue);
    }
  });

  test("1 night stay", () => {
    const { days, totals } = report({
      bookings: [
        booking({
          checkIn: "2026-03-11",
          checkOut: "2026-03-12",
          totalPrice: 15_000,
          netTotal: 15_000,
        }),
      ],
    });
    assert.deepEqual(
      days.map((d) => d.netRevenue),
      [0, 15_000, 0],
    );
    assert.deepEqual(
      days.map((d) => d.occupiedRooms),
      [0, 1, 0],
    );
    assert.equal(totals.netRevenue, 15_000);
  });

  test("stay crossing the range boundary counts only nights inside", () => {
    // 4 nights: 03-08, 03-09, 03-10, 03-11 -> 25001, 25000, 25000, 25000
    const { days, totals } = report({
      bookings: [
        booking({
          checkIn: "2026-03-08",
          checkOut: "2026-03-12",
          totalPrice: 100_001,
          netTotal: 100_001,
        }),
      ],
    });
    assert.deepEqual(
      days.map((d) => d.netRevenue),
      [25_000, 25_000, 0],
    );
    assert.equal(totals.netRevenue, 50_000);
    assert.deepEqual(
      days.map((d) => d.occupiedRooms),
      [1, 1, 0],
    );
  });

  test("stay crossing the end of the range", () => {
    // 3 nights: 03-12, 03-13, 03-14 -> first night gets the remainder
    const { days } = report({
      bookings: [
        booking({
          checkIn: "2026-03-12",
          checkOut: "2026-03-15",
          totalPrice: 100,
          netTotal: 100,
        }),
      ],
    });
    assert.deepEqual(
      days.map((d) => d.netRevenue),
      [0, 0, 34],
    );
  });

  test("occupancy and check-out day is free", () => {
    const { days, totals } = report({
      activeRooms: 4,
      bookings: [
        booking({ roomId: 1, checkIn: "2026-03-10", checkOut: "2026-03-11" }),
        booking({ roomId: 1, checkIn: "2026-03-11", checkOut: "2026-03-12" }),
        booking({ roomId: 2, checkIn: "2026-03-10", checkOut: "2026-03-12" }),
      ],
    });
    assert.deepEqual(
      days.map((d) => d.occupiedRooms),
      [2, 2, 0],
    );
    assert.deepEqual(
      days.map((d) => d.occupancy),
      [50, 50, 0],
    );
    assert.equal(totals.occupiedRooms, 4);
    assert.equal(totals.activeRoomNights, 12);
    assert.equal(totals.occupancy, 33.3);
  });

  test("breakfast on mornings check_in+1..check_out, dinner on check_in..check_out-1", () => {
    const { days, totals } = report({
      from: "2026-03-09",
      to: "2026-03-14",
      bookings: [
        booking({
          checkIn: "2026-03-10",
          checkOut: "2026-03-13",
          adults: 2,
          children: 1,
          breakfast: true,
          dinner: true,
        }),
      ],
    });
    // 09, 10, 11, 12, 13, 14
    assert.deepEqual(
      days.map((d) => d.breakfastGuests),
      [0, 0, 3, 3, 3, 0],
    );
    assert.deepEqual(
      days.map((d) => d.dinnerGuests),
      [0, 3, 3, 3, 0, 0],
    );
    assert.equal(totals.breakfastGuests, 9);
    assert.equal(totals.dinnerGuests, 9);
  });

  test("breakfast on check-out morning just inside the range", () => {
    const { days } = report({
      bookings: [
        booking({
          checkIn: "2026-03-07",
          checkOut: "2026-03-10",
          breakfast: true,
        }),
      ],
    });
    assert.deepEqual(
      days.map((d) => d.breakfastGuests),
      [2, 0, 0],
    );
    assert.deepEqual(
      days.map((d) => d.occupiedRooms),
      [0, 0, 0],
    );
  });

  test("payment at 01:30 Tbilisi time lands on that Tbilisi day", () => {
    // 2026-03-10 21:30 UTC = 2026-03-11 01:30 Tbilisi (UTC+4)
    const { days, totals } = report({
      payments: [
        {
          paidAt: new Date("2026-03-10T21:30:00Z"),
          paymentMethod: "cash",
          amount: 30_000,
        },
        {
          paidAt: new Date("2026-03-10T19:59:00Z"),
          paymentMethod: "card",
          amount: 12_000,
        },
      ],
    });
    assert.deepEqual(
      days.map((d) => d.cashReceived),
      [0, 30_000, 0],
    );
    assert.deepEqual(
      days.map((d) => d.cardReceived),
      [12_000, 0, 0],
    );
    assert.equal(totals.cashReceived, 30_000);
    assert.equal(totals.cardReceived, 12_000);
  });

  test("payments outside the range are ignored", () => {
    const { totals } = report({
      payments: [
        {
          // 2026-03-13 00:30 Tbilisi
          paidAt: new Date("2026-03-12T20:30:00Z"),
          paymentMethod: "cash",
          amount: 5_000,
        },
      ],
    });
    assert.equal(totals.cashReceived, 0);
  });

  test("expenses and profit", () => {
    const { days, totals } = report({
      bookings: [booking({ totalPrice: 30_000, netTotal: 30_000 })],
      expenses: [
        { date: "2026-03-10", amount: 4_000 },
        { date: "2026-03-10", amount: 1_000 },
        { date: "2026-03-12", amount: 15_000 },
      ],
    });
    assert.deepEqual(
      days.map((d) => d.expenses),
      [5_000, 0, 15_000],
    );
    assert.deepEqual(
      days.map((d) => d.profit),
      [5_000, 10_000, -5_000],
    );
    assert.equal(totals.profit, 10_000);
  });

  test("zero active rooms gives 0% occupancy", () => {
    const { days } = report({ activeRooms: 0 });
    assert.equal(days[0]!.occupancy, 0);
  });
});
