import { sourceStyles } from "@/components/admin/booking-calendar";
import { Badge } from "@/components/ui/badge";
import type { BookingSource, BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

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

export function SourceBadge({ source }: { source: BookingSource }) {
  const style = sourceStyles[source];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap text-bar-foreground",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}
