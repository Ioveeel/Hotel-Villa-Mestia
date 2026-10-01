"use client";

import { motion } from "motion/react";

type Props = {
  id: string;
  number: number;
  title: string;
  description?: string;
  // Fade in when the step appears after an action (not on first paint)
  animateIn?: boolean;
  children: React.ReactNode;
};

export function Step({ id, number, title, description, animateIn, children }: Props) {
  const headingId = `${id}-title`;
  return (
    <motion.section
      id={id}
      aria-labelledby={headingId}
      initial={animateIn ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-20 border-t border-border pt-8"
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          {number}
        </span>
        <div className="space-y-1">
          <h2 id={headingId} className="text-h3 font-medium">
            <span className="sr-only">Step {number}: </span>
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}
