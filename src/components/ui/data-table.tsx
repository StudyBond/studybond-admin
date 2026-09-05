"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowsSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { ChevronRight } from "lucide-react";

/**
 * One responsive table for the whole admin.
 *
 * Before this, eleven pages each hand-wrote a `<table>` plus a separate
 * `md:hidden` card list — the same data described twice, so the two drifted
 * (analytics never got a card list at all and just scrolled sideways on
 * phones). Here you describe the columns once and get both renderings:
 *
 *   >= md   a real table
 *   <  md   a stacked card per row, built from the same column defs
 *
 * Loading, empty and error are handled here too, so a list cannot ship
 * missing one of those states.
 */

export type Column<T> = {
  /** Stable id for the column. */
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  /**
   * The identifying column. On mobile it becomes the card headline instead
   * of getting a "Question: ..." label. Mark exactly one column primary.
   */
  primary?: boolean;
  /** Numbers: right-aligned and tabular so digits line up. */
  numeric?: boolean;
  /** Hide this column in the mobile card (keep it in the table). */
  hideOnCard?: boolean;
  /** Hide in the table until this breakpoint. Keeps wide tables honest. */
  showFrom?: "lg" | "xl";
  /** Optional fixed column width, e.g. "12rem". */
  width?: string;
};

/**
 * Optional row selection, for bulk actions.
 *
 * Real `<input type="checkbox">` elements rather than a styled span, so the
 * list can be worked through with a keyboard and read correctly by a screen
 * reader. The free-exam pool previously put `onClick` on the `<tr>` with a
 * decorative tick inside — reachable by mouse only.
 *
 * `href` and `selection` are mutually exclusive: a row either navigates or
 * it selects. Passing both makes the row select and drops the link.
 */
type Selection = {
  selectedIds: Set<string | number>;
  onToggle: (id: string | number) => void;
  /** Selects or clears every row currently rendered. */
  onToggleAll?: () => void;
  areAllSelected?: boolean;
  /** Screen-reader label for one row's checkbox, e.g. "Select question 41". */
  getLabel?: (item: unknown) => string;
};

type DataTableProps<T> = {
  items: T[];
  columns: Column<T>[];
  getKey: (item: T) => string | number;
  /** Makes every row and card navigate. Ignored when `selection` is set. */
  href?: (item: T) => string;
  selection?: Selection;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** Screen-reader name for the table. */
  caption: string;
  className?: string;
};

const showFromStyles = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

/** One checkbox, styled once so header and rows cannot drift apart. */
function SelectBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--sb-accent)]"
    />
  );
}

export function DataTable<T>({
  items,
  columns,
  getKey,
  href,
  selection,
  isLoading,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyIcon,
  emptyAction,
  caption,
  className,
}: DataTableProps<T>) {
  const shell = cn(
    "overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]",
    className,
  );

  if (error) {
    return (
      <div className={shell}>
        <ErrorState
          error={error}
          onRetry={onRetry}
          className="rounded-none border-0 bg-transparent"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={shell}>
        <RowsSkeleton />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={shell}>
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  const primary = columns.find((column) => column.primary) ?? columns[0];
  const secondary = columns.filter(
    (column) => column !== primary && !column.hideOnCard,
  );

  return (
    <div className={shell}>
      {/* ── Mobile: one card per row ─────────────────────────── */}
      <ul className="divide-y divide-[var(--sb-border)] md:hidden">
        {items.map((item) => {
          const id = getKey(item);
          const isSelected = selection?.selectedIds.has(id) ?? false;

          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                {selection ? (
                  <span className="mt-0.5">
                    <SelectBox
                      checked={isSelected}
                      onChange={() => selection.onToggle(id)}
                      label={selection.getLabel?.(item) ?? `Select row ${id}`}
                    />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1 text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                  {primary.cell(item)}
                </div>
                {href && !selection ? (
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-text-tertiary)]" />
                ) : null}
              </div>

              {secondary.length ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {secondary.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {column.header}
                      </dt>
                      <dd
                        className={cn(
                          "mt-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]",
                          column.numeric && "sb-nums",
                        )}
                      >
                        {column.cell(item)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </>
          );

          return (
            <li
              key={id}
              className={cn(
                selection && isSelected && "bg-[var(--sb-accent-soft)]",
              )}
            >
              {href && !selection ? (
                <Link
                  href={href(item)}
                  className="block p-4 transition-colors duration-[var(--sb-duration-fast)] hover:bg-[var(--sb-surface-2)]"
                >
                  {body}
                </Link>
              ) : (
                <div className="p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ── Desktop: a real table ────────────────────────────── */}
      <div className="sb-scroll-x hidden md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-[var(--sb-border)] bg-[var(--sb-bg-inset)]">
              {selection ? (
                <th scope="col" className="w-10 px-4 py-2.5">
                  {selection.onToggleAll ? (
                    <SelectBox
                      checked={selection.areAllSelected ?? false}
                      onChange={selection.onToggleAll}
                      label="Select every row on this page"
                    />
                  ) : null}
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]",
                    column.numeric && "text-right",
                    column.showFrom && showFromStyles[column.showFrom],
                  )}
                >
                  {column.header}
                </th>
              ))}
              {href && !selection ? (
                <th scope="col" className="w-10 px-2" />
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--sb-border)]">
            {items.map((item) => {
              const id = getKey(item);
              const isSelected = selection?.selectedIds.has(id) ?? false;

              return (
              <tr
                key={id}
                /* The whole row is a click target for convenience, but the
                   checkbox is what carries the semantics and the keyboard
                   focus — the old version had onClick on the tr alone. */
                onClick={
                  selection ? () => selection.onToggle(id) : undefined
                }
                className={cn(
                  "transition-colors duration-[var(--sb-duration-fast)]",
                  href && !selection && "hover:bg-[var(--sb-surface-2)]",
                  selection && "cursor-pointer",
                  selection &&
                    (isSelected
                      ? "bg-[var(--sb-accent-soft)]"
                      : "hover:bg-[var(--sb-surface-2)]"),
                )}
              >
                {selection ? (
                  <td className="px-4 py-3 align-middle">
                    <SelectBox
                      checked={isSelected}
                      onChange={() => selection.onToggle(id)}
                      label={selection.getLabel?.(item) ?? `Select row ${id}`}
                    />
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 align-middle text-[length:var(--sb-text-sm)]",
                      column === primary
                        ? "text-[var(--sb-text)]"
                        : "text-[var(--sb-text-secondary)]",
                      column.numeric && "sb-nums text-right",
                      column.showFrom && showFromStyles[column.showFrom],
                    )}
                  >
                    {href && !selection && column === primary ? (
                      <Link
                        href={href(item)}
                        className="block hover:text-[var(--sb-accent-text)]"
                      >
                        {column.cell(item)}
                      </Link>
                    ) : (
                      column.cell(item)
                    )}
                  </td>
                ))}
                {href && !selection ? (
                  <td className="px-2 py-3">
                    <Link
                      href={href(item)}
                      aria-label="Open"
                      className="flex h-7 w-7 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-tertiary)] transition-colors hover:bg-[var(--sb-surface-3)] hover:text-[var(--sb-text)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                ) : null}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
