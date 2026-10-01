"use client";

import type { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GuestValues } from "@/lib/guest-schema";

type FieldName = keyof GuestValues;

type Props = {
  form: UseFormReturn<GuestValues>;
  onSubmit: (values: GuestValues) => Promise<void>;
  submitError: string | null;
  totalLabel: string | null;
};

const fields: {
  name: FieldName;
  label: string;
  optional?: boolean;
  type?: string;
  autoComplete: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}[] = [
  { name: "firstName", label: "First name", autoComplete: "given-name" },
  { name: "lastName", label: "Last name", autoComplete: "family-name" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", inputMode: "tel" },
  { name: "email", label: "Email", optional: true, type: "email", autoComplete: "email" },
  { name: "country", label: "Country", optional: true, autoComplete: "country-name" },
];

export function GuestForm({ form, onSubmit, submitError, totalLabel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `guest-${f.name}`;
          const error = errors[f.name]?.message;
          return (
            <div key={f.name} className="space-y-2">
              <Label htmlFor={id}>
                {f.label}
                {f.optional && (
                  <span className="font-normal text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Input
                id={id}
                type={f.type ?? "text"}
                autoComplete={f.autoComplete}
                inputMode={f.inputMode}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                {...register(f.name)}
              />
              {error && (
                <p id={`${id}-error`} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {submitError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="space-y-3">
        {totalLabel && (
          <p className="flex items-baseline justify-between gap-4">
            <span className="text-muted-foreground">Total, paid at the hotel</span>
            <span className="text-xl font-semibold text-price">{totalLabel}</span>
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
          {isSubmitting ? "Booking…" : "Confirm booking"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No prepayment. You pay on arrival, in cash or by card.
        </p>
      </div>
    </form>
  );
}
