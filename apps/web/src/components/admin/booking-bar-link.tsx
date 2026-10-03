"use client";

import { BookingLink } from "@/components/admin/booking-link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function BookingBarLink({
  tooltip,
  ...props
}: React.ComponentProps<typeof BookingLink> & {
  tooltip: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BookingLink {...props} />
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
