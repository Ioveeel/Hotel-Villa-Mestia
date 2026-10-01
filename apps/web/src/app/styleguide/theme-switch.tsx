"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const modes = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

type Mode = (typeof modes)[number]["value"];

// Styleguide only: forces html.light / html.dark, not persisted.
export function ThemeSwitch() {
  const [mode, setMode] = useState<Mode>("system");

  function apply(next: Mode) {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (next !== "system") root.classList.add(next);
    setMode(next);
  }

  return (
    <div role="group" aria-label="Color scheme" className="flex gap-1">
      {modes.map(({ value, label, Icon }) => (
        <Button
          key={value}
          size="sm"
          variant={mode === value ? "secondary" : "ghost"}
          aria-pressed={mode === value}
          onClick={() => apply(value)}
        >
          <Icon aria-hidden />
          {label}
        </Button>
      ))}
    </div>
  );
}
