"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminNavLink({
  href,
  exact,
  children,
}: {
  href: string;
  // Active only on href itself, not on its subpaths
  exact?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-lg px-3 whitespace-nowrap text-foreground transition-colors duration-200 hover:bg-background/60 focus-visible:outline-2 focus-visible:outline-offset-2",
        active && "bg-background font-medium",
      )}
    >
      {children}
    </Link>
  );
}
