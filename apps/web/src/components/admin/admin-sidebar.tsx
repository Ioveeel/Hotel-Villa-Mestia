import Link from "next/link";
import { CalendarDays, ChartColumn, ClipboardList, Receipt } from "lucide-react";

// Placeholder: sections are not built yet
const sections = [
  { label: "Calendar", icon: CalendarDays },
  { label: "Bookings", icon: ClipboardList },
  { label: "Expenses", icon: Receipt },
  { label: "Reports", icon: ChartColumn },
];

export function AdminSidebar() {
  return (
    <aside className="border-b border-border bg-surface md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link
          href="/admin"
          className="rounded-sm font-heading text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Villa Mestia
        </Link>
      </div>
      <nav aria-label="Admin" className="overflow-x-auto px-2 pb-2 md:pb-0">
        <ul className="flex gap-1 md:flex-col">
          {sections.map(({ label, icon: Icon }) => (
            <li key={label}>
              <span
                aria-disabled
                className="flex h-11 items-center gap-3 rounded-lg px-3 whitespace-nowrap text-muted-foreground"
              >
                <Icon aria-hidden className="size-4.5" />
                {label}
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
