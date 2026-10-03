import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  detail,
  negative,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  // Highlights a loss
  negative?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-5 py-4",
        negative && "border-destructive/40 bg-destructive/5",
        className,
      )}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-heading text-2xl font-semibold tabular-nums",
          negative && "text-destructive",
        )}
      >
        {value}
      </dd>
      {detail && (
        <dd className="mt-1 text-sm text-muted-foreground tabular-nums">
          {detail}
        </dd>
      )}
    </div>
  );
}
