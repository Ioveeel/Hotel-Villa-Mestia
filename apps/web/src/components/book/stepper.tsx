"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

// Number input as − value + buttons (44px+ touch targets)
export function Stepper({ id, label, hint, value, min, max, onChange }: Props) {
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
    >
      <div>
        <p id={`${id}-label`} className="font-medium">
          {label}
        </p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus aria-hidden />
        </Button>
        <output aria-live="polite" className="w-6 text-center text-lg font-semibold tabular-nums">
          {value}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus aria-hidden />
        </Button>
      </div>
    </div>
  );
}
