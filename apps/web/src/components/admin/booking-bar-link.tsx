"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Opens the booking panel without a server round trip: the URL changes
// (so Back closes the panel), the calendar is not re-rendered.
export function BookingBarLink({
  href,
  tooltip,
  ...props
}: Omit<React.ComponentProps<"a">, "href"> & {
  href: string;
  tooltip: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          onClick={(e) => {
            // Let modified clicks open a new tab
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            window.history.pushState(null, "", href);
          }}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
