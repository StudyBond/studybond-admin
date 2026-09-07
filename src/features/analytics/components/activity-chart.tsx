"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { formatInteger } from "@/lib/utils/format";
import { useId, useMemo, useState } from "react";

export type ActivityPoint = {
  label: string;
  exams: number;
  collaborations: number;
};

type ActivityChartProps = {
  data: ActivityPoint[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
};

/**
 * Grouped bars, two series, one shared axis.
 *
 * Both series are counts, so they share a scale — never a second y-axis.
 * Series colours are IDENTITY (chart-1 / chart-2), deliberately separate
 * from the status tokens, so a bar can never be misread as "this is bad".
 */
const SERIES = [
  { key: "exams", label: "Exam starts", color: "var(--sb-chart-1)" },
  {
    key: "collaborations",
    label: "Collaboration sessions",
    color: "var(--sb-chart-2)",
  },
] as const;

/** Round axis maximum up to a friendly number so gridlines read cleanly. */
function niceMax(value: number) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}

export function ActivityChart({
  data,
  title = "Weekly activity",
  description = "Exam starts and collaboration sessions, last 7 days.",
  isLoading = false,
  className,
}: ActivityChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const headingId = useId();

  const max = useMemo(
    () =>
      niceMax(
        Math.max(1, ...data.flatMap((d) => [d.exams, d.collaborations])),
      ),
    [data],
  );

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, point) => ({
          exams: acc.exams + point.exams,
          collaborations: acc.collaborations + point.collaborations,
        }),
        { exams: 0, collaborations: 0 },
      ),
    [data],
  );

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
            {description}
          </p>
        </div>

        {/* Legend. Always present for two series — identity is never
            carried by colour alone. */}
        <ul className="flex shrink-0 flex-wrap gap-x-4 gap-y-1.5">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: series.color }}
              />
              <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                {series.label}
              </span>
              <span className="sb-nums text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text)]">
                {formatInteger(totals[series.key])}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isLoading ? (
        <Skeleton className="mt-5 h-52 w-full" />
      ) : !data.length ? (
        <p className="mt-5 py-16 text-center text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
          No activity recorded in this window.
        </p>
      ) : (
        <div className="mt-5">
          <div className="flex gap-1.5">
            {/* Y axis — recessive, four labels, no box */}
            <div
              aria-hidden="true"
              className="sb-nums flex h-44 w-auto min-w-5 shrink-0 flex-col justify-between text-right text-[10px] text-[var(--sb-text-tertiary)]"
            >
              {[...gridLines].reverse().map((ratio) => (
                <span key={ratio} className="leading-none">
                  {formatInteger(Math.round(max * ratio))}
                </span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              {/* Gridlines */}
              <div aria-hidden="true" className="absolute inset-0 h-44">
                {gridLines.map((ratio) => (
                  <span
                    key={ratio}
                    className="absolute inset-x-0 h-px"
                    style={{
                      bottom: `${ratio * 100}%`,
                      background:
                        ratio === 0
                          ? "var(--sb-chart-axis)"
                          : "var(--sb-chart-grid)",
                    }}
                  />
                ))}
              </div>

              {/* Bars */}
              <div className="relative flex h-44 items-end gap-1 sm:gap-2">
                {data.map((point, index) => {
                  const isHovered = hoverIndex === index;

                  return (
                    <div
                      key={point.label}
                      className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]"
                      onMouseEnter={() => setHoverIndex(index)}
                      onMouseLeave={() => setHoverIndex(null)}
                      onFocus={() => setHoverIndex(index)}
                      onBlur={() => setHoverIndex(null)}
                      tabIndex={0}
                      role="img"
                      aria-label={`${point.label}: ${point.exams} exam starts, ${point.collaborations} collaboration sessions`}
                    >
                      {/* Hover band, sits behind the bars */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute inset-x-0 inset-y-0 rounded-[var(--sb-radius-sm)] bg-[var(--sb-surface-3)] transition-opacity duration-[var(--sb-duration-fast)]",
                          isHovered ? "opacity-60" : "opacity-0",
                        )}
                      />

                      {SERIES.map((series) => {
                        const value = point[series.key];
                        const heightPercent = (value / max) * 100;

                        return (
                          <span
                            key={series.key}
                            className="relative w-full max-w-3 rounded-t-[4px] transition-[height] duration-[var(--sb-duration)] ease-[var(--sb-ease)]"
                            style={{
                              height: `max(2px, ${heightPercent}%)`,
                              background: series.color,
                              opacity:
                                hoverIndex === null || isHovered ? 1 : 0.45,
                            }}
                          />
                        );
                      })}

                      {/* Tooltip */}
                      {isHovered ? (
                        <div
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-[var(--sb-radius)] border border-[var(--sb-border-hover)] bg-[var(--sb-surface-3)] px-2.5 py-2 shadow-[var(--sb-shadow-lg)]"
                        >
                          <p className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text)]">
                            {point.label}
                          </p>
                          <dl className="mt-1 space-y-0.5">
                            {SERIES.map((series) => (
                              <div
                                key={series.key}
                                className="flex items-center gap-1.5"
                              >
                                <span
                                  aria-hidden="true"
                                  className="h-1.5 w-1.5 rounded-[1px]"
                                  style={{ background: series.color }}
                                />
                                <dt className="text-[10px] text-[var(--sb-text-secondary)]">
                                  {series.label}
                                </dt>
                                <dd className="sb-nums ml-auto pl-2 text-[10px] font-medium text-[var(--sb-text)]">
                                  {formatInteger(point[series.key])}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* X axis */}
              <div className="mt-2 flex gap-1 sm:gap-2">
                {data.map((point, index) => (
                  <span
                    key={point.label}
                    className={cn(
                      "sb-nums min-w-0 flex-1 truncate text-center text-[10px] transition-colors duration-[var(--sb-duration-fast)]",
                      hoverIndex === index
                        ? "text-[var(--sb-text)]"
                        : "text-[var(--sb-text-tertiary)]",
                    )}
                  >
                    {point.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
