"use client";

import { useEffect, useRef } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { formatDate, formatPriceRounded } from "@/lib/format";
import type { ReportDay } from "@/lib/types";

// Only the pieces this chart uses, so the rest of Chart.js is tree-shaken
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

const series = [
  { key: "netRevenue", label: "Net revenue" },
  { key: "expenses", label: "Expenses" },
  { key: "profit", label: "Profit" },
] as const;

// "2026-10-08" -> "8 Oct"
function shortDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

// Colors live in CSS tokens (globals.css), so light/dark switch in one place
function readTheme(el: HTMLElement) {
  const style = getComputedStyle(el);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    revenue: v("--chart-revenue"),
    expenses: v("--chart-expenses"),
    profit: v("--chart-profit"),
    card: v("--card"),
    text: v("--muted-foreground"),
    grid: v("--border"),
    zero: v("--input"),
    tooltipBg: v("--foreground"),
    tooltipText: v("--background"),
    font: getComputedStyle(document.body).fontFamily,
  };
}

// Net revenue and expenses as bars, profit as a line. One axis (all GEL).
// The table below the chart is the accessible view of the same numbers.
export function ReportChart({ days }: { days: ReportDay[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const theme = readTheme(canvas);
    // Chart values in GEL; tooltips format the exact tetri
    const gel = (tetri: number) => tetri / 100;
    const thinBars = days.length > 45;

    const chart = new Chart(canvas, {
      data: {
        labels: days.map((d) => shortDay(d.date)),
        datasets: [
          {
            type: "line",
            label: "Profit",
            data: days.map((d) => gel(d.profit)),
            borderColor: theme.profit,
            backgroundColor: theme.profit,
            borderWidth: 2,
            pointRadius: days.length > 31 ? 0 : 3,
            pointHoverRadius: 5,
            pointBorderColor: theme.card,
            pointBorderWidth: 2,
            tension: 0,
            order: 0,
          },
          {
            type: "bar",
            label: "Net revenue",
            data: days.map((d) => gel(d.netRevenue)),
            backgroundColor: theme.revenue,
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: "start",
            categoryPercentage: 0.8,
            barPercentage: thinBars ? 1 : 0.9,
            order: 1,
          },
          {
            type: "bar",
            label: "Expenses",
            data: days.map((d) => gel(d.expenses)),
            backgroundColor: theme.expenses,
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: "start",
            categoryPercentage: 0.8,
            barPercentage: thinBars ? 1 : 0.9,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion ? false : { duration: 250 },
        interaction: { mode: "index", intersect: false },
        font: { family: theme.font },
        scales: {
          x: {
            grid: { display: false },
            border: { color: theme.grid },
            ticks: {
              color: theme.text,
              autoSkip: true,
              maxRotation: 0,
              font: { size: 12 },
            },
          },
          y: {
            border: { display: false },
            grid: {
              color: (ctx) => (ctx.tick.value === 0 ? theme.zero : theme.grid),
              lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.5 : 1),
            },
            ticks: {
              color: theme.text,
              maxTicksLimit: 6,
              font: { size: 12 },
              callback: (value) => `${Number(value).toLocaleString("en-US")} ₾`,
            },
          },
        },
        plugins: {
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            padding: 10,
            cornerRadius: 8,
            boxPadding: 4,
            usePointStyle: true,
            // Bars first, then profit
            itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
            callbacks: {
              title: (items) => formatDate(days[items[0]!.dataIndex]!.date),
              label: (item) => {
                const day = days[item.dataIndex]!;
                const key =
                  series.find((s) => s.label === item.dataset.label)?.key ??
                  "profit";
                return ` ${item.dataset.label}: ${formatPriceRounded(day[key])}`;
              },
            },
          },
        },
      },
    });

    // Re-read tokens when the theme changes (system setting or html.dark/.light)
    const applyTheme = () => {
      const t = readTheme(canvas);
      const [profit, revenue, expenses] = chart.data.datasets;
      Object.assign(profit!, {
        borderColor: t.profit,
        backgroundColor: t.profit,
        pointBorderColor: t.card,
      });
      revenue!.backgroundColor = t.revenue;
      expenses!.backgroundColor = t.expenses;
      const { x, y } = chart.options.scales!;
      x!.ticks!.color = t.text;
      x!.border!.color = t.grid;
      y!.ticks!.color = t.text;
      y!.grid!.color = (ctx) => (ctx.tick.value === 0 ? t.zero : t.grid);
      const tooltip = chart.options.plugins!.tooltip!;
      tooltip.backgroundColor = t.tooltipBg;
      tooltip.titleColor = t.tooltipText;
      tooltip.bodyColor = t.tooltipText;
      chart.update("none");
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      media.removeEventListener("change", applyTheme);
      observer.disconnect();
      chart.destroy();
    };
  }, [days]);

  return (
    <figure className="space-y-3">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            {s.key === "profit" ? (
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full bg-chart-profit"
              />
            ) : (
              <span
                aria-hidden
                className={
                  s.key === "netRevenue"
                    ? "size-3 rounded-sm bg-chart-revenue"
                    : "size-3 rounded-sm bg-chart-expenses"
                }
              />
            )}
            {s.label}
          </li>
        ))}
      </ul>
      <div className="relative h-64 sm:h-80">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Net revenue and expenses per day as bars, profit as a line. The same numbers are in the table below."
        />
      </div>
    </figure>
  );
}
