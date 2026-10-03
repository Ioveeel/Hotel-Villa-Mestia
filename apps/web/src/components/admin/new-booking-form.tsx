"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { sourceStyles } from "@/components/admin/booking-calendar";
import { describedBy, Field, Select } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  createAdminBooking,
  humanizeApiMessage,
  previewAdminBooking,
} from "@/lib/api";
import { addDays, daysBetween, isIsoDate } from "@/lib/dates";
import { formatPrice, parseGelToTetri } from "@/lib/format";
import { guestSchema } from "@/lib/guest-schema";
import type {
  AdminBookingPreview,
  AdminBookingPreviewInput,
  AdminBookingSource,
  AdminRoom,
  CreateAdminBookingInput,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// Same limits as POST /admin/bookings (apps/api/src/routes/admin/bookings.ts)
const MAX_PAST_DAYS = 365;
const MAX_NIGHTS = 30;
const MAX_GUESTS = 4;
const NETWORK_ERROR = "Could not reach the server. Please try again.";
const CONFLICT_ERROR = "Room is already booked for these dates";

const sources: AdminBookingSource[] = ["booking_com", "phone", "walk_in"];

// Optional text fields are "" in the form and omitted from the request
const optional = (schema: z.ZodString) =>
  z.string().trim().pipe(z.union([z.literal(""), schema]));

function makeSchema(rooms: AdminRoom[], today: string) {
  return z
    .object({
      source: z.enum(["booking_com", "phone", "walk_in"]),
      roomId: z.string().min(1, "Choose a room"),
      checkIn: z.string().refine(isIsoDate, "Choose a check-in date"),
      checkOut: z.string().refine(isIsoDate, "Choose a check-out date"),
      adults: z.string(),
      children: z.string(),
      breakfast: z.boolean(),
      dinner: z.boolean(),
      amount: z.string(),
      notes: z
        .string()
        .trim()
        .max(1000, "Notes must be at most 1000 characters"),
      guest: guestSchema.extend({
        phone: optional(
          z
            .string()
            .regex(/^[0-9 +]{7,20}$/, "Use 7–20 characters: digits, spaces and +"),
        ),
        documentNumber: optional(
          z.string().regex(/^[A-Za-z0-9]{5,20}$/, "Use 5–20 letters or digits"),
        ),
      }),
    })
    .superRefine((v, ctx) => {
      if (isIsoDate(v.checkIn) && isIsoDate(v.checkOut)) {
        if (v.checkIn < addDays(today, -MAX_PAST_DAYS)) {
          ctx.addIssue({
            code: "custom",
            path: ["checkIn"],
            message: `Check-in can be at most ${MAX_PAST_DAYS} days in the past`,
          });
        }
        const nights = daysBetween(v.checkIn, v.checkOut);
        if (nights < 1) {
          ctx.addIssue({
            code: "custom",
            path: ["checkOut"],
            message: "Check-out must be after check-in",
          });
        } else if (nights > MAX_NIGHTS) {
          ctx.addIssue({
            code: "custom",
            path: ["checkOut"],
            message: `Stay can be at most ${MAX_NIGHTS} nights`,
          });
        }
      }

      const room = rooms.find((r) => String(r.id) === v.roomId);
      if (room && Number(v.adults) + Number(v.children) > room.maxGuests) {
        ctx.addIssue({
          code: "custom",
          path: ["adults"],
          message: `${roomLabel(room)} allows at most ${room.maxGuests} guests`,
        });
      }

      if (v.source === "booking_com") {
        const tetri = parseGelToTetri(v.amount);
        if (tetri === null || tetri === 0) {
          ctx.addIssue({
            code: "custom",
            path: ["amount"],
            message: "Enter the Booking.com amount, e.g. 220 or 220.50",
          });
        }
      }
    });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

function roomLabel(room: AdminRoom): string {
  return `Room ${room.number} · ${room.roomTypeName}`;
}

// Request body without the guest, or null while the stay is incomplete/invalid
function toPreviewInput(
  v: FormValues,
  rooms: AdminRoom[],
): AdminBookingPreviewInput | null {
  const room = rooms.find((r) => String(r.id) === v.roomId);
  if (!room || !isIsoDate(v.checkIn) || !isIsoDate(v.checkOut)) return null;
  const nights = daysBetween(v.checkIn, v.checkOut);
  if (nights < 1 || nights > MAX_NIGHTS) return null;
  const adults = Number(v.adults);
  const children = Number(v.children);
  if (adults + children > room.maxGuests) return null;

  const isBooking = v.source === "booking_com";
  const roomTotal = isBooking ? parseGelToTetri(v.amount) : null;
  if (isBooking && !roomTotal) return null;

  const notes = v.notes.trim();
  return {
    source: v.source,
    roomId: room.id,
    checkIn: v.checkIn,
    checkOut: v.checkOut,
    adults,
    children,
    // Booking.com always includes breakfast
    breakfast: isBooking || v.breakfast,
    dinner: v.dinner,
    ...(notes && { notes }),
    ...(roomTotal && { roomTotal }),
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function NewBookingForm({
  rooms,
  today,
  initialRoomId,
  initialCheckIn,
}: {
  rooms: AdminRoom[];
  today: string;
  initialRoomId: number | null;
  initialCheckIn: string;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Shown only while room and dates are unchanged since the failed submit
  const [conflictKey, setConflictKey] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(makeSchema(rooms, today)),
    mode: "onTouched",
    defaultValues: {
      source: "booking_com",
      roomId: initialRoomId ? String(initialRoomId) : "",
      checkIn: initialCheckIn,
      checkOut: addDays(initialCheckIn, 1),
      adults: "2",
      children: "0",
      breakfast: false,
      dinner: false,
      amount: "",
      notes: "",
      guest: {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        country: "",
        documentNumber: "",
      },
    },
  });
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form;
  const values = useWatch({ control }) as FormValues;
  const isBooking = values.source === "booking_com";
  const selectedRoom = rooms.find((r) => String(r.id) === values.roomId);
  const maxGuests = selectedRoom?.maxGuests ?? MAX_GUESTS;
  const stayKey = `${values.roomId}|${values.checkIn}|${values.checkOut}`;
  const conflict = conflictKey === stayKey;

  // Preview: debounced, refetched when the stay or price inputs change; stale requests are aborted
  const previewInput = toPreviewInput(values, rooms);
  const previewKey = previewInput ? JSON.stringify(previewInput) : null;
  const [previewState, setPreviewState] = useState<{
    key: string;
    preview?: AdminBookingPreview;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!previewKey) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      previewAdminBooking(JSON.parse(previewKey) as AdminBookingPreviewInput, {
        signal: controller.signal,
      }).then(
        (preview) => setPreviewState({ key: previewKey, preview }),
        (err: unknown) => {
          if (controller.signal.aborted) return;
          setPreviewState({
            key: previewKey,
            error:
              err instanceof ApiError
                ? humanizeApiMessage(err.message)
                : NETWORK_ERROR,
          });
        },
      );
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [previewKey]);

  const previewLoading = previewKey !== null && previewState?.key !== previewKey;
  const previewError = !previewLoading ? previewState?.error : undefined;
  // Keep showing the previous preview (dimmed) while the next one loads
  const preview = previewKey ? previewState?.preview : undefined;

  async function onSubmit(v: FormValues) {
    setSubmitError(null);
    const stay = toPreviewInput(v, rooms);
    if (!stay) return;
    const guest = Object.fromEntries(
      Object.entries(v.guest).filter(([, value]) => value !== ""),
    ) as CreateAdminBookingInput["guest"];

    try {
      await createAdminBooking({ ...stay, guest });
      router.push(`/admin/calendar?from=${addDays(stay.checkIn, -3)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictKey(stayKey);
      } else {
        setSubmitError(
          err instanceof ApiError ? humanizeApiMessage(err.message) : NETWORK_ERROR,
        );
      }
    }
  }

  const amountError = errors.amount?.message;
  const adultsError = errors.adults?.message;
  const checkInError = errors.checkIn?.message;
  const checkOutError = errors.checkOut?.message;
  const roomError = errors.roomId?.message;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
    >
      <div className="space-y-6">
        <Section title="Stay">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Source</legend>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <label
                  key={source}
                  className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-4 text-[0.9375rem] font-medium transition-colors duration-200 hover:border-foreground/30 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
                >
                  <input
                    type="radio"
                    value={source}
                    className="sr-only"
                    {...register("source")}
                  />
                  <span
                    aria-hidden
                    className={cn("size-2.5 rounded-full", sourceStyles[source].className)}
                  />
                  {sourceStyles[source].label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nb-room" label="Room" error={roomError} className="sm:col-span-2">
              <Select id="nb-room" error={roomError} {...register("roomId")}>
                <option value="" disabled>
                  Choose a room
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {roomLabel(room)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field id="nb-check-in" label="Check-in" error={checkInError}>
              <Input
                id="nb-check-in"
                type="date"
                min={addDays(today, -MAX_PAST_DAYS)}
                {...describedBy("nb-check-in", checkInError)}
                {...register("checkIn")}
              />
            </Field>
            <Field id="nb-check-out" label="Check-out" error={checkOutError}>
              <Input
                id="nb-check-out"
                type="date"
                min={isIsoDate(values.checkIn) ? addDays(values.checkIn, 1) : undefined}
                max={
                  isIsoDate(values.checkIn)
                    ? addDays(values.checkIn, MAX_NIGHTS)
                    : undefined
                }
                {...describedBy("nb-check-out", checkOutError)}
                {...register("checkOut")}
              />
            </Field>

            {conflict && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive sm:col-span-2"
              >
                {CONFLICT_ERROR}
              </p>
            )}

            <Field id="nb-adults" label="Adults" error={adultsError}>
              <Select id="nb-adults" error={adultsError} {...register("adults")}>
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="nb-children" label="Children">
              <Select id="nb-children" {...register("children")}>
                {Array.from({ length: maxGuests }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>

            {isBooking && (
              <Field
                id="nb-amount"
                label="Booking.com amount (₾)"
                error={amountError}
                hint="Room price from Booking.com, breakfast included"
                className="sm:col-span-2"
              >
                <div className="relative">
                  <Input
                    id="nb-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="220.50"
                    className="pr-10"
                    {...describedBy(
                      "nb-amount",
                      amountError,
                      "Room price from Booking.com, breakfast included",
                    )}
                    {...register("amount")}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground"
                  >
                    ₾
                  </span>
                </div>
              </Field>
            )}
          </div>
        </Section>

        <Section title="Meals">
          <fieldset className="space-y-3">
            <legend className="sr-only">Meals</legend>
            <MealOption
              label="Breakfast"
              hint={isBooking ? "Included in Booking.com price" : "Per person / night"}
              checked={isBooking || values.breakfast}
              disabled={isBooking}
              onChange={(checked) => setValue("breakfast", checked)}
            />
            <MealOption
              label="Dinner"
              hint="Per person / night"
              checked={values.dinner}
              onChange={(checked) => setValue("dinner", checked)}
            />
          </fieldset>
        </Section>

        <Section title="Guest">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { name: "firstName", label: "First name", autoComplete: "off" },
                { name: "lastName", label: "Last name", autoComplete: "off" },
                { name: "phone", label: "Phone", optional: true, type: "tel", inputMode: "tel" },
                { name: "email", label: "Email", optional: true, type: "email" },
                { name: "country", label: "Country", optional: true },
                { name: "documentNumber", label: "Document number", optional: true },
              ] as const
            ).map((f) => {
              const id = `nb-guest-${f.name}`;
              const error = errors.guest?.[f.name]?.message;
              return (
                <Field key={f.name} id={id} label={f.label} optional={"optional" in f} error={error}>
                  <Input
                    id={id}
                    type={"type" in f ? f.type : "text"}
                    inputMode={"inputMode" in f ? f.inputMode : undefined}
                    autoComplete="off"
                    {...describedBy(id, error)}
                    {...register(`guest.${f.name}`)}
                  />
                </Field>
              );
            })}
          </div>
        </Section>

        <Section title="Notes">
          <Field id="nb-notes" label="Notes" optional error={errors.notes?.message}>
            <textarea
              id="nb-notes"
              rows={3}
              className="w-full min-w-0 rounded-lg border border-input bg-card px-4 py-3 text-base text-foreground transition-[border-color,box-shadow] duration-200 outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              {...describedBy("nb-notes", errors.notes?.message)}
              {...register("notes")}
            />
          </Field>
        </Section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8">
        <div
          aria-live="polite"
          aria-busy={previewLoading}
          className={cn(
            "rounded-xl bg-surface p-5 transition-opacity duration-200",
            previewLoading && "opacity-60",
          )}
        >
          <h2 className="mb-3 font-heading text-lg font-semibold">Price</h2>
          {!previewKey ? (
            <p className="text-sm text-muted-foreground">
              {isBooking
                ? "Choose a room, dates and the Booking.com amount to see the price."
                : "Choose a room and dates to see the price."}
            </p>
          ) : previewError ? (
            <p role="alert" className="text-sm text-destructive">
              {previewError}
            </p>
          ) : preview ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Room · {preview.nights} {preview.nights === 1 ? "night" : "nights"}
                </dt>
                <dd>{formatPrice(preview.roomTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Meals</dt>
                <dd>{formatPrice(preview.mealsTotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
                <dt className="font-medium">Total</dt>
                <dd
                  className={cn(
                    "font-semibold",
                    isBooking ? "text-base" : "text-2xl text-price",
                  )}
                >
                  {formatPrice(preview.totalPrice)}
                </dd>
              </div>
              {isBooking && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      Commission · {preview.commissionRate / 100}%
                    </dt>
                    <dd>−{formatPrice(preview.commissionAmount)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
                    <dt className="font-medium">You receive</dt>
                    <dd className="text-2xl font-semibold text-price">
                      {formatPrice(preview.netTotal)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Calculating price…
            </p>
          )}
        </div>

        {submitError && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
          {isSubmitting ? "Saving…" : "Create booking"}
        </Button>
      </aside>
    </form>
  );
}

function MealOption({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-colors duration-200 hover:border-foreground/30 has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
        disabled && "cursor-not-allowed hover:border-border",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-primary outline-none"
      />
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </label>
  );
}
