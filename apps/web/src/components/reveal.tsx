"use client";

import { useEffect, useRef } from "react";
import { animate, inView } from "motion";

// Subtle fade + rise on scroll. Rendered visible on the server; only elements
// below the fold are hidden (after JS loads) and revealed when scrolled into view.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";

    return inView(
      el,
      () => {
        animate(
          el,
          { opacity: 1, transform: "translateY(0)" },
          { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
        );
      },
      { margin: "0px 0px -10% 0px" },
    );
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
