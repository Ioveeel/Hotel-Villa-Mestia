"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Loader2,
  Mail,
  Phone,
  Undo2,
} from "lucide-react";
import { sourceStyles } from "@/components/admin/booking-calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ApiError,
  cancelBooking,
  getAdminBooking,
  humanizeApiMessage,
  markBookingPaid,
  undoBookingPayment,
  updateGuestDocument,
} from "@/lib/api";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import type {
  AdminBookingDetails,
  BookingStatus,
  PaymentMethod,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const NETWORK_ERROR = "Could not reach the server. Please try again.";
// Same rule as guests_document_number_check
const DOCUMENT_PATTERN = /^[A-Za-z0-9]{5,20}$/;

type Action = PaymentMethod | "unpay" | "cancel";

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? humanizeApiMessage(err.message) : NETWORK_ERROR;
}

function parseBookingId(value: string | null): number | null {
  return value && /^[1-9][0-9]{0,9}$/.test(value) ? Number(value) : null;
}

const statusVariant: Record<
  BookingStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  pending: "accent",
  confirmed: "outline",
  checked_in: "glacier",
  checked_out: "secondary",
  cancelled: "destructive",
};

// Reads ?booking=<id>; the calendar bars set it (see booking-bar-link.tsx)
export function BookingPanel() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const id = parseBookingId(searchParams.get("booking"));
  // Keeps the last booking rendered while the sheet animates out
  const [shownId, setShownId] = useState(id);
  if (id !== null && id !== shownId) setShownId(id);

  function close() {
    const params = new URLSearchParams(searchParams);
    params.delete("booking");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : pathname);
  }

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent>
        {shownId !== null && <BookingDetails key={shownId} id={shownId} />}
      </SheetContent>
    </Sheet>
  );
}

function BookingDetails({ id }: { id: number }) {
  const router = useRouter();
  const [booking, setBooking] = useState<AdminBookingDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [actionError, setActionError] = useState<{
    action: Action;
    message: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAdminBooking(id, { signal: controller.signal }).then(setBooking, (err) => {
      if (controller.signal.aborted) return;
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? "Booking not found."
          : errorMessage(err),
      );
    });
    return () => controller.abort();
  }, [id]);

  async function run(action: Action, call: () => Promise<AdminBookingDetails>) {
    setPending(action);
    setActionError(null);
    try {
      setBooking(await call());
    } catch (err) {
      setActionError({ action, message: errorMessage(err) });
      // 409: someone changed the booking meanwhile, show the current state
      if (err instanceof ApiError && err.status === 409) {
        getAdminBooking(id).then(setBooking, () => {});
      }
    } finally {
      setPending(null);
      router.refresh();
    }
  }

  if (!booking) {
    return (
      <>
        <PanelHeader>
          <SheetTitle>Booking #{id}</SheetTitle>
          <SheetDescription>
            {loadError ?? "Loading booking details…"}
          </SheetDescription>
        </PanelHeader>
        {loadError ? (
          <p role="alert" className="px-5 py-6 text-sm text-destructive sm:px-6">
            {loadError}
          </p>
        ) : (
          <div aria-hidden className="space-y-4 px-5 py-6 sm:px-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-surface motion-reduce:animate-none"
              />
            ))}
          </div>
        )}
      </>
    );
  }

  const b = booking;
  const source = sourceStyles[b.source];
  const isBookingCom = b.source === "booking_com";
  const cancelled = b.status === "cancelled";
  const guestName = `${b.guest.firstName} ${b.guest.lastName}`;
  const meals =
    [
      b.breakfast && (isBookingCom ? "Breakfast (included)" : "Breakfast"),
      b.dinner && "Dinner",
    ]
      .filter(Boolean)
      .join(", ") || "None";
  const errorFor = (...actions: Action[]) =>
    actionError && actions.includes(actionError.action) ? (
      <p role="alert" className="text-sm text-destructive">
        {actionError.message}
      </p>
    ) : null;

  return (
    <>
      <PanelHeader>
        <SheetTitle>Booking #{b.id}</SheetTitle>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium text-bar-foreground",
              source.className,
            )}
          >
            {source.label}
          </span>
          <Badge variant={statusVariant[b.status]} className="capitalize">
            {b.status.replace("_", " ")}
          </Badge>
          {b.externalRef && (
            <span className="text-xs text-muted-foreground">
              Ref. {b.externalRef}
            </span>
          )}
        </div>
        <SheetDescription className="sr-only">
          {guestName}, room {b.roomNumber}, {formatDate(b.checkIn)} to{" "}
          {formatDate(b.checkOut)}
        </SheetDescription>
      </PanelHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
        <Section title="Stay">
          <Rows>
            <Row label="Room">
              Room {b.roomNumber} · {b.roomTypeName}
            </Row>
            <Row label="Check-in">{formatDate(b.checkIn)}</Row>
            <Row label="Check-out">{formatDate(b.checkOut)}</Row>
            <Row label="Nights">{b.nights}</Row>
            <Row label="Guests">
              {b.adults} {b.adults === 1 ? "adult" : "adults"}
              {b.children > 0 &&
                `, ${b.children} ${b.children === 1 ? "child" : "children"}`}
            </Row>
            <Row label="Meals">{meals}</Row>
          </Rows>
        </Section>

        <Section title="Guest">
          <p className="font-medium">{guestName}</p>
          <div className="space-y-1">
            {b.guest.phone && (
              <ContactLink
                href={`tel:${b.guest.phone.replace(/\s+/g, "")}`}
                icon={<Phone aria-hidden className="size-4" />}
              >
                {b.guest.phone}
              </ContactLink>
            )}
            {b.guest.email && (
              <ContactLink
                href={`mailto:${b.guest.email}`}
                icon={<Mail aria-hidden className="size-4" />}
              >
                {b.guest.email}
              </ContactLink>
            )}
          </div>
          <Rows>
            {!b.guest.phone && <Row label="Phone">—</Row>}
            <Row label="Country">{b.guest.country ?? "—"}</Row>
          </Rows>
          {(b.notes || b.guest.notes) && (
            <div className="space-y-2">
              {[b.notes, b.guest.notes].filter(Boolean).map((note, i) => (
                <p
                  key={i}
                  className="rounded-lg bg-surface px-3 py-2 text-sm whitespace-pre-wrap"
                >
                  {note}
                </p>
              ))}
            </div>
          )}
          <DocumentNumberForm
            guestId={b.guest.id}
            value={b.guest.documentNumber}
            onSaved={(guest) => {
              setBooking((prev) => prev && { ...prev, guest });
              router.refresh();
            }}
          />
        </Section>

        <Section title="Money">
          <Rows>
            <Row label="Room">{formatPrice(b.roomTotal)}</Row>
            <Row label="Meals">{formatPrice(b.mealsTotal)}</Row>
            <Row label="Total" strong>
              {formatPrice(b.totalPrice)}
            </Row>
            {isBookingCom && (
              <>
                <Row label={`Commission (${b.commissionRateBp / 100}%)`}>
                  −{formatPrice(b.commissionAmount)}
                </Row>
                <Row label="You receive" strong>
                  <span className="text-price">{formatPrice(b.netTotal)}</span>
                </Row>
              </>
            )}
          </Rows>
        </Section>

        <Section title="Payment">
          {b.paidAt && b.paymentMethod ? (
            <>
              <p className="flex items-center gap-2">
                {b.paymentMethod === "cash" ? (
                  <Banknote aria-hidden className="size-4.5 text-primary" />
                ) : (
                  <CreditCard aria-hidden className="size-4.5 text-primary" />
                )}
                <span>
                  <span className="font-medium">
                    {b.paymentMethod === "cash" ? "Paid in cash" : "Paid by card"}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {formatDateTime(b.paidAt)}
                  </span>
                </span>
              </p>
              <Button
                variant="outline"
                disabled={pending !== null}
                onClick={() => run("unpay", () => undoBookingPayment(b.id))}
              >
                {pending === "unpay" ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : (
                  <Undo2 aria-hidden />
                )}
                Undo payment
              </Button>
            </>
          ) : cancelled ? (
            <p className="text-sm text-muted-foreground">Not paid.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Not paid yet. Guest pays on arrival.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["cash", "card"] as const).map((method) => (
                  <Button
                    key={method}
                    disabled={pending !== null}
                    onClick={() => run(method, () => markBookingPaid(b.id, method))}
                  >
                    {pending === method ? (
                      <Loader2 aria-hidden className="animate-spin" />
                    ) : method === "cash" ? (
                      <Banknote aria-hidden />
                    ) : (
                      <CreditCard aria-hidden />
                    )}
                    {method === "cash" ? "Paid in cash" : "Paid by card"}
                  </Button>
                ))}
              </div>
            </>
          )}
          {errorFor("cash", "card", "unpay")}
        </Section>

        {!cancelled && (
          <div className="space-y-2 pt-2 pb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={pending !== null}
                >
                  {pending === "cancel" && (
                    <Loader2 aria-hidden className="animate-spin" />
                  )}
                  Cancel booking
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Cancel booking #{b.id}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {guestName}, room {b.roomNumber}, {formatDate(b.checkIn)} →{" "}
                  {formatDate(b.checkOut)}. The room becomes free for these
                  dates. This can&apos;t be undone.
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button variant="outline">Keep booking</Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      onClick={() => run("cancel", () => cancelBooking(b.id))}
                    >
                      Cancel booking
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {errorFor("cancel")}
          </div>
        )}
      </div>
    </>
  );
}

function DocumentNumberForm({
  guestId,
  value,
  onSaved,
}: {
  guestId: number;
  value: string | null;
  onSaved: (guest: AdminBookingDetails["guest"]) => void;
}) {
  const [input, setInput] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const trimmed = input.trim();
  const unchanged = trimmed === (value ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed && !DOCUMENT_PATTERN.test(trimmed)) {
      setError("Use 5–20 letters or digits");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Empty input clears the number
      const guest = await updateGuestDocument(guestId, trimmed || null);
      setInput(guest.documentNumber ?? "");
      setSaved(true);
      onSaved(guest);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2 pt-1">
      <Label htmlFor="document-number">Document number</Label>
      <div className="flex gap-2">
        <Input
          id="document-number"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
            setSaved(false);
          }}
          placeholder="ID or passport number"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "document-number-error" : undefined}
        />
        <Button type="submit" variant="outline" disabled={saving || unchanged}>
          {saving && <Loader2 aria-hidden className="animate-spin" />}
          Save
        </Button>
      </div>
      {error && (
        <p id="document-number-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p role="status" className="text-sm text-muted-foreground empty:hidden">
        {saved && (value ? "Saved." : "Document number removed.")}
      </p>
    </form>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-b border-border px-5 pt-5 pr-16 pb-4 sm:px-6">
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="space-y-1.5 text-sm">{children}</dl>;
}

function Row({
  label,
  strong,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-4",
        strong && "border-t border-border pt-1.5 font-semibold",
      )}
    >
      <dt className={cn(!strong && "text-muted-foreground")}>{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

function ContactLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-primary underline-offset-4 transition-colors duration-150 hover:bg-muted/70 hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      {icon}
      <span className="break-all">{children}</span>
    </a>
  );
}
