import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/#rooms", label: "Rooms" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background">
      <div className="mx-auto flex h-16 w-full max-w-300 items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-sm font-heading text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Villa Mestia
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex h-11 items-center rounded-full px-4 text-[0.9375rem] text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden md:inline-flex">
            <Link href="/book">Book now</Link>
          </Button>

          {/* Mobile menu: native disclosure, works without JS. Booking is in the sticky bottom bar. */}
          <details className="group relative md:hidden">
            <summary className="flex size-11 list-none items-center justify-center rounded-full hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" aria-hidden />
              <span className="sr-only">Menu</span>
            </summary>
            <nav
              aria-label="Main"
              className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-lg shadow-foreground/8"
            >
              <ul>
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex h-11 items-center rounded-lg px-3 hover:bg-muted/70 focus-visible:outline-2"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
