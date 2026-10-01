import Link from "next/link";
import { Button } from "@/components/ui/button";

// Sticky bottom "Book now" on mobile (all public pages except the booking flow)
export function MobileBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <Button asChild size="lg" className="w-full">
        <Link href="/book">Book now</Link>
      </Button>
    </div>
  );
}
