import { cn } from "@/lib/utils";

// Mountain silhouette shown until real photos exist; will be replaced by next/image
export function PlaceholderPhoto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden bg-gradient-to-b from-glacier via-surface to-surface",
        className,
      )}
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
  );
}
