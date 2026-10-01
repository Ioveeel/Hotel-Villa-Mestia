import { BedDouble, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { RoomType } from "@/lib/types";

type Props = Pick<RoomType, "name" | "beds" | "maxGuests" | "basePrice"> & {
  href: string;
};

export function RoomCard({ name, beds, maxGuests, basePrice, href }: Props) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lg hover:shadow-foreground/8 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Placeholder until real photos exist; will be next/image */}
      <div
        aria-hidden
        className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-glacier via-surface to-surface"
      >
        <svg
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full text-primary/25"
        >
          <path
            fill="currentColor"
            d="M0 300 L0 210 L70 150 L120 190 L190 95 L250 170 L300 130 L400 215 L400 300 Z"
          />
          <path
            fill="currentColor"
            d="M0 300 L0 245 L90 205 L170 240 L260 200 L340 235 L400 220 L400 300 Z"
          />
        </svg>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="text-h3 font-medium">{name}</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <BedDouble className="size-4" aria-hidden />
              {beds}
            </li>
            <li className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              Up to {maxGuests} guests
            </li>
          </ul>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4">
          <p>
            <span className="block text-xl font-semibold text-price">
              {formatPrice(basePrice)}
            </span>
            <span className="text-sm text-muted-foreground">per night</span>
          </p>
          <Button asChild>
            <a href={href}>Book</a>
          </Button>
        </div>
      </div>
    </article>
  );
}
