"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils/cn";
import { formatInteger } from "@/lib/utils/format";
import { useEffect, useMemo, useState } from "react";

export type ActivityPoint = {
  label: string;
  exams: number;
  collaborations: number;
};

type ActivityChartProps = {
  data: ActivityPoint[];
  title?: string;
  eyebrow?: string;
  description?: string;
};

function getDefaultSelectedIndex(data: ActivityPoint[]) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index];
    if (point.exams > 0 || point.collaborations > 0) {
      return index;
    }
  }

  return Math.max(0, data.length - 1);
}

function getBarHeight(value: number, maxValue: number, minimumHeight: number) {
  if (value <= 0) {
    return minimumHeight;
  }

  return Math.max(minimumHeight + 6, Math.round((value / maxValue) * 112));
}

export function ActivityChart({
  data,
  title = "Study and collaboration volume",
  eyebrow = "7-day activity",
  description = "Live exam starts and collaboration sessions across the selected window.",
}: ActivityChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => getDefaultSelectedIndex(data));

  useEffect(() => {
    setSelectedIndex((current) => {
      if (current >= 0 && current < data.length) {
        return current;
      }

      return getDefaultSelectedIndex(data);
    });
  }, [data]);

  const maxValue = Math.max(1, ...data.flatMap((item) => [item.exams, item.collaborations]));
  const selectedPoint = data[selectedIndex];

  const totals = useMemo(
    () =>
      data.reduce(
        (accumulator, point) => ({
          exams: accumulator.exams + point.exams,
          collaborations: accumulator.collaborations + point.collaborations,
        }),
        { exams: 0, collaborations: 0 },
      ),
    [data],
  );

  const peakDay = useMemo(() => {
    return data.reduce<ActivityPoint | null>((currentPeak, point) => {
      if (!currentPeak) {
        return point;
      }

      const currentTotal = currentPeak.exams + currentPeak.collaborations;
      const nextTotal = point.exams + point.collaborations;
      return nextTotal > currentTotal ? point : currentPeak;
    }, null);
  }, [data]);

  return (
    <Surface glow="cyan" className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--accent-cyan)]">
            {eyebrow}
          </p>
          <h3 className="mt-3 text-[1.75rem] font-semibold leading-tight text-white sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="cyan">Exam starts</StatusBadge>
          <StatusBadge tone="emerald">Collaboration</StatusBadge>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-white/8 bg-black/10 px-4 py-10 text-sm text-[color:var(--muted-foreground)]">
          No activity data is available for the selected period yet.
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-[24px] border border-white/8 bg-black/10 p-4 md:hidden">
            <div className="grid h-[11.5rem] grid-cols-7 items-end gap-1.5">
              {data.map((item, index) => {
                const examHeight = getBarHeight(item.exams, maxValue, 8);
                const collaborationHeight = getBarHeight(item.collaborations, maxValue, 8);
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "flex h-full flex-col items-center justify-end gap-2 rounded-[1.2rem] px-1 pb-2 pt-3 transition-all duration-200",
                      isSelected
                        ? "bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(110,196,184,0.2)]"
                        : "hover:bg-white/[0.03]",
                    )}
                  >
                    <div className="flex h-24 items-end gap-1">
                      <span
                        className="w-2 rounded-full bg-[linear-gradient(180deg,rgba(143,211,200,0.98),rgba(59,130,246,0.68))] shadow-[0_8px_18px_rgba(56,189,248,0.18)]"
                        style={{ height: `${examHeight}px` }}
                        title={`Exam starts: ${formatInteger(item.exams)}`}
                      />
                      <span
                        className="w-2 rounded-full bg-[linear-gradient(180deg,rgba(154,199,105,0.98),rgba(21,128,61,0.65))] shadow-[0_8px_18px_rgba(132,204,22,0.18)]"
                        style={{ height: `${collaborationHeight}px` }}
                        title={`Collaboration sessions: ${formatInteger(item.collaborations)}`}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-[0.14em]",
                        isSelected ? "text-white" : "text-[color:var(--muted-foreground)]",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedPoint ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      Selected day
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">{selectedPoint.label}</p>
                  </div>
                  <StatusBadge
                    tone={
                      selectedPoint.exams + selectedPoint.collaborations > 0 ? "cyan" : "slate"
                    }
                  >
                    {formatInteger(selectedPoint.exams + selectedPoint.collaborations)} total
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      Exam starts
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatInteger(selectedPoint.exams)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      Collaboration
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatInteger(selectedPoint.collaborations)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      7-day exams
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatInteger(totals.exams)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      Peak day
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {peakDay?.label ?? "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 hidden grid-cols-7 gap-3 md:grid">
            {data.map((item, index) => {
              const examHeight = getBarHeight(item.exams, maxValue, 12);
              const collaborationHeight = getBarHeight(item.collaborations, maxValue, 12);

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="admin-enter rounded-[22px] border border-white/8 bg-black/10 px-3 py-4"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex h-44 items-end justify-center gap-2">
                    <div
                      className="w-4 rounded-full bg-[linear-gradient(180deg,rgba(143,211,200,0.98),rgba(59,130,246,0.68))] shadow-[0_10px_24px_rgba(56,189,248,0.18)]"
                      style={{ height: `${examHeight}px` }}
                      title={`Exam starts: ${formatInteger(item.exams)}`}
                    />
                    <div
                      className="w-4 rounded-full bg-[linear-gradient(180deg,rgba(154,199,105,0.98),rgba(21,128,61,0.65))] shadow-[0_10px_24px_rgba(132,204,22,0.18)]"
                      style={{ height: `${collaborationHeight}px` }}
                      title={`Collaboration sessions: ${formatInteger(item.collaborations)}`}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {formatInteger(item.exams)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                      {formatInteger(item.collaborations)} collab
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Surface>
  );
}
