import { BedDouble, Users } from "lucide-react";
import { PlaceholderPhoto } from "@/components/placeholder-photo";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { RoomType } from "@/lib/types";

type Props = Pick<RoomType, "name" | "beds" | "maxGuests" | "basePrice"> & {
  href: string;
};

export function RoomCard({ name, beds, maxGuests, basePrice, href }: Props) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lg hover:shadow-foreground/8 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <PlaceholderPhoto className="aspect-4/3" />

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
          <p className="text-sm text-muted-foreground">
            from{" "}
            <span className="text-xl font-semibold text-price">
              {formatPrice(basePrice)}
            </span>{" "}
            / night
          </p>
          <Button asChild>
            <a href={href} aria-label={`Book ${name}`}>
              Book
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
