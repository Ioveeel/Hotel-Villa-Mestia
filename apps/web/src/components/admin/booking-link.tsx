"use client";

// Opens the booking panel without a server round trip: the URL changes
// (so Back closes the panel), the page is not re-rendered.
function openPanel(href: string) {
  window.history.pushState(null, "", href);
}

// Let modified clicks open a new tab
function isModified(e: React.MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

export function BookingLink({
  href,
  onClick,
  ...props
}: Omit<React.ComponentProps<"a">, "href"> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || isModified(e)) return;
        e.preventDefault();
        openPanel(href);
      }}
      {...props}
    />
  );
}

// Whole row clickable for the mouse; keyboard users use the BookingLink inside
export function BookingRow({
  href,
  ...props
}: React.ComponentProps<"tr"> & { href: string }) {
  return (
    <tr
      onClick={(e) => {
        if (isModified(e) || (e.target as Element).closest("a, button")) return;
        openPanel(href);
      }}
      {...props}
    />
  );
}
