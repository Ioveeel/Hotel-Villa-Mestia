import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/reveal";
import { RoomCard } from "@/components/room-card";
import { ThemeSwitch } from "./theme-switch";

// Temporary page for reviewing the design foundation. Remove before launch.
export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const colors = [
  { name: "snow", token: "bg-snow", note: "background" },
  { name: "sand", token: "bg-sand", note: "surface" },
  { name: "stone", token: "bg-stone", note: "foreground" },
  { name: "slate", token: "bg-slate", note: "muted text" },
  { name: "pine", token: "bg-pine", note: "primary" },
  { name: "ember", token: "bg-ember", note: "accent, decorative" },
  { name: "ember-ink", token: "bg-ember-ink", note: "accent text, prices" },
  { name: "glacier", token: "bg-glacier", note: "decorative" },
  { name: "border", token: "bg-border", note: "lines" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="text-h2">{title}</h2>
        {children}
      </section>
    </Reveal>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-16 px-4 py-10 sm:px-6 md:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-wide text-ember-ink">
            Villa Mestia
          </p>
          <h1 className="text-h1">Styleguide</h1>
          <p className="max-w-prose text-lead text-muted-foreground">
            Design foundation preview. Temporary page.
          </p>
        </div>
        <ThemeSwitch />
      </header>

      <Section title="Colors">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {colors.map((c) => (
            <li key={c.name} className="space-y-2">
              <div
                className={`aspect-[3/2] rounded-lg border border-border ${c.token}`}
              />
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <div className="space-y-4">
          <p className="text-display font-heading">Above the clouds</p>
          <p className="text-h1 font-heading">Heading 1 — Svaneti</p>
          <p className="text-h2 font-heading">Heading 2 — Rooms &amp; prices</p>
          <p className="text-h3 font-heading">Heading 3 — Breakfast</p>
          <p className="max-w-prose text-lead text-muted-foreground">
            Lead text. A small family hotel at the foot of Mount Ushba, with
            wood, stone and a fireplace.
          </p>
          <p className="max-w-prose">
            Body text. Breakfast is 20 ₾ per person, dinner is 40 ₾. Guests pay
            on arrival, cash or card. Check-in from 14:00.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div lang="en" className="space-y-2">
            <p className="text-sm text-muted-foreground">Latin</p>
            <p className="text-h3 font-heading">Mountain views from every room</p>
            <p>Warm rooms, homemade food and quiet mornings in Mestia. 120 ₾</p>
          </div>
          <div lang="ka" className="space-y-2">
            <p className="text-sm text-muted-foreground">ქართული</p>
            <p className="text-h3 font-heading">მთის ხედი ყველა ოთახიდან</p>
            <p>
              თბილი ოთახები, სახლის საჭმელი და მშვიდი დილა მესტიაში. 120 ₾
            </p>
            <p className="text-sm text-muted-foreground">
              Mtavruli: ᲡᲕᲐᲜᲔᲗᲘ
            </p>
          </div>
          <div lang="ru" className="space-y-2">
            <p className="text-sm text-muted-foreground">Кириллица</p>
            <p className="text-h3 font-heading">Вид на горы из каждого номера</p>
            <p>Тёплые номера, домашняя еда и тихое утро в Местии. 120 ₾</p>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Book now</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Cancel booking</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">
            Check availability
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
          <Button size="sm">Small</Button>
          <Button size="icon" variant="outline" aria-label="Next">
            <ArrowRight aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Confirmed</Badge>
          <Badge variant="secondary">Breakfast included</Badge>
          <Badge variant="glacier">Mountain view</Badge>
          <Badge variant="ember">2 rooms left</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Inputs">
        <form className="grid max-w-xl gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sg-first">First name</Label>
            <Input id="sg-first" autoComplete="given-name" placeholder="Nino" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-last">Last name</Label>
            <Input
              id="sg-last"
              autoComplete="family-name"
              placeholder="Gelovani"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-phone">Phone</Label>
            <Input
              id="sg-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+995 5xx xx xx xx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-email">Email (invalid state)</Label>
            <Input
              id="sg-email"
              type="email"
              defaultValue="nino@"
              aria-invalid
              aria-describedby="sg-email-error"
            />
            <p id="sg-email-error" className="text-sm text-destructive">
              Enter a valid email.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-checkin">Check-in</Label>
            <Input id="sg-checkin" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-disabled">Disabled</Label>
            <Input id="sg-disabled" disabled value="Room 4" readOnly />
          </div>
        </form>
      </Section>

      <Section title="Room card">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <RoomCard
            name="Double Room"
            beds="1 double bed"
            maxGuests={2}
            basePrice={12000}
            href="#"
          />
          <RoomCard
            name="Triple Room"
            beds="1 double + 1 single"
            maxGuests={3}
            basePrice={15000}
            href="#"
          />
          <RoomCard
            name="Quadruple Room"
            beds="2 double beds"
            maxGuests={4}
            basePrice={18000}
            href="#"
          />
        </div>
      </Section>
    </main>
  );
}
