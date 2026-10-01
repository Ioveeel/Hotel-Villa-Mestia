// TODO: real Booking.com property URL
const BOOKING_COM_URL = "https://www.booking.com/";

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="scroll-mt-16 border-t border-border bg-surface pb-24 md:pb-0"
    >
      <div className="mx-auto grid w-full max-w-300 gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 md:py-16">
        <div className="space-y-2">
          <p className="font-heading text-xl font-semibold">Villa Mestia</p>
          <p className="text-sm text-muted-foreground">
            A small family hotel in Mestia, Svaneti.
          </p>
        </div>

        {/* Placeholder contacts until real details are known */}
        <address className="space-y-1 text-sm not-italic">
          <p className="font-medium">Contact</p>
          <p className="text-muted-foreground">Mestia, Svaneti, Georgia</p>
          <p className="text-muted-foreground">Phone: +995 5XX XXX XXX</p>
          <p className="text-muted-foreground">Email: hello@example.com</p>
        </address>

        <div className="space-y-1 text-sm md:text-right">
          <p className="text-muted-foreground">
            Also on{" "}
            <a
              href={BOOKING_COM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Booking.com
            </a>
          </p>
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} Villa Mestia
          </p>
        </div>
      </div>
    </footer>
  );
}
