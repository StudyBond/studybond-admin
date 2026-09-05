"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Filter row.
 *
 * The old questions page used `grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]`
 * — five filters stacked full-width on everything under 1280px, then five
 * columns all at once. This uses an auto-fitting track instead, so filters
 * reflow continuously: 1 up, 2 up, 3 up, as many as fit. No breakpoint cliff,
 * and adding a sixth filter needs no template edit.
 *
 * `search` gets a wider minimum than the rest, since it holds a sentence.
 */
export function FilterBar({
  search,
  children,
  action,
  className,
}: {
  search?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {search ? (
          <div className="w-full lg:max-w-sm lg:shrink-0">{search}</div>
        ) : null}

        {children ? (
          <div className="grid flex-1 gap-3 [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]">
            {children}
          </div>
        ) : null}

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

/** Chip row for quick filters. Scrolls horizontally on narrow screens. */
export function FilterChips({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn("sb-scroll-x sb-scroll-hide -mx-1 flex gap-1.5 px-1 pb-0.5", className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 rounded-[var(--sb-radius-full)] border px-3 py-1.5 text-[length:var(--sb-text-xs)] font-medium transition-colors duration-[var(--sb-duration-fast)]",
              isActive
                ? "border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] text-[var(--sb-accent-text)]"
                : "border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-secondary)] hover:border-[var(--sb-border-hover)] hover:text-[var(--sb-text)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pagination. Shows the record range, not just "Page 1 of 9". */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const rangeStart =
    total && pageSize ? Math.min((page - 1) * pageSize + 1, total) : null;
  const rangeEnd =
    total && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="sb-nums text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
        {rangeStart && rangeEnd && total ? (
          <>
            Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()}
          </>
        ) : (
          <>
            Page {page} of {totalPages}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}
