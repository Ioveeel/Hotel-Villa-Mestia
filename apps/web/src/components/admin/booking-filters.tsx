"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { sourceStyles } from "@/components/admin/booking-calendar";
import { Select } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BookingStatus } from "@/lib/types";

const SEARCH_DELAY_MS = 300;

const statuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
];

// URL params owned by the filters; any change resets the page and closes the panel
const FILTER_KEYS = ["q", "status", "source", "paid", "from", "to"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

// Typed fields: kept as drafts and sent to the URL after a pause
type Draft = { q: string; from: string; to: string };
const DRAFT_KEYS = ["q", "from", "to"] as const;

// Typing a year in a date input passes through dates like 0002-10-03
function draftReady(key: keyof Draft, value: string) {
  return key === "q" || value === "" || value >= "2000-01-01";
}

export function BookingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // Selects show the new value right away, not after the page reloads
  const [params, setParams] = useOptimistic(searchParams.toString());
  const value = (key: FilterKey) => new URLSearchParams(params).get(key) ?? "";

  const urlDraft: Draft = {
    q: searchParams.get("q") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  };
  const [draft, setDraft] = useState(urlDraft);
  // Back/forward changes the URL: show its values. Values we sent ourselves
  // are skipped, so typing during a navigation isn't overwritten.
  const [seenDraft, setSeenDraft] = useState(urlDraft);
  if (DRAFT_KEYS.some((k) => urlDraft[k] !== seenDraft[k])) {
    setSeenDraft(urlDraft);
    const next = { ...draft };
    for (const k of DRAFT_KEYS) {
      if (urlDraft[k] !== seenDraft[k] && urlDraft[k] !== draft[k].trim()) {
        next[k] = urlDraft[k];
      }
    }
    setDraft(next);
  }

  function navigate(
    changes: Partial<Record<FilterKey, string>>,
    replace = false,
  ) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    next.delete("booking");
    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      setParams(query);
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  useEffect(() => {
    const changes: Partial<Draft> = {};
    for (const k of DRAFT_KEYS) {
      const v = draft[k].trim();
      if (v !== urlDraft[k] && draftReady(k, v)) changes[k] = v;
    }
    if (Object.keys(changes).length === 0) return;
    // Replace for search: Back shouldn't step through every typed word
    const searchOnly = Object.keys(changes).every((k) => k === "q");
    const timer = setTimeout(
      () => navigate(changes, searchOnly),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.q, draft.from, draft.to, urlDraft.q, urlDraft.from, urlDraft.to]);

  const editDraft =
    (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));
  const hasFilters = FILTER_KEYS.some((key) => searchParams.has(key));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
      <div className="relative">
        <Label htmlFor="booking-search" className="sr-only">
          Search bookings
        </Label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="booking-search"
          type="search"
          value={draft.q}
          onChange={editDraft("q")}
          placeholder="Name, phone, email or booking number"
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          className="pr-10 pl-10"
        />
        {isPending && (
          <Loader2
            aria-hidden
            className="absolute top-1/2 right-3.5 size-4.5 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="filter-status">Status</Label>
          <Select
            id="filter-status"
            value={value("status")}
            onChange={(e) => navigate({ status: e.target.value })}
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-source">Source</Label>
          <Select
            id="filter-source"
            value={value("source")}
            onChange={(e) => navigate({ source: e.target.value })}
          >
            <option value="">All</option>
            {Object.entries(sourceStyles).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-paid">Payment</Label>
          <Select
            id="filter-paid"
            value={value("paid")}
            onChange={(e) => navigate({ paid: e.target.value })}
          >
            <option value="">All</option>
            <option value="true">Paid</option>
            <option value="false">Unpaid</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-from">Staying from</Label>
          <Input
            id="filter-from"
            type="date"
            value={draft.from}
            onChange={editDraft("from")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-to">Staying to</Label>
          <Input
            id="filter-to"
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={editDraft("to")}
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            className="self-end"
            onClick={() =>
              navigate(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])))
            }
          >
            <X aria-hidden />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
