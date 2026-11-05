"use client";

import { Button } from "@/components/ui/button";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { FieldShell } from "@/components/ui/field";
import { InstitutionSelect } from "@/features/questions/components/institution-select";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  NO_YEAR,
  type ReviewFilters,
  type ReviewView,
} from "@/features/questions/lib/review-place";
import type { QueueOrder } from "@/features/questions/lib/review-queue";
import type { AdminInstitutionListItem, QuestionFacetsResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { formatInteger } from "@/lib/utils/format";
import { QUESTION_POOL_OPTIONS } from "@/lib/utils/questions";
import { LayoutGrid, List, X } from "lucide-react";
import { useMemo } from "react";

/**
 * The content review filters.
 *
 * Subject and Year are menus of what is actually waiting, each with its
 * count, rather than a box where a subject had to be typed exactly as the
 * bank spells it. Each menu's counts ignore its own choice, so with Physics
 * picked the subject menu still shows how many every other subject holds,
 * while the years follow the subject. The counts follow the other filters
 * too: with "Draft only", every number is drafts.
 *
 * Below them, each filter in use is a chip that removes it, and one button
 * clears them all. Sort is not a filter: it changes the order, not what is
 * shown, so clearing leaves it alone.
 */

const STATUS_OPTIONS: Array<{ label: string; value: ReviewFilters["status"] }> = [
  { label: "Not yet published", value: "DRAFT,VERIFIED" },
  { label: "Draft only", value: "DRAFT" },
  { label: "Verified only", value: "VERIFIED" },
];

const PICTURE_OPTIONS: Array<{ label: string; value: ReviewFilters["picture"] }> = [
  { label: "Any", value: "" },
  { label: "Needs a picture", value: "needed" },
  { label: "Drawing to check", value: "to_check" },
];

const POOL_OPTIONS = [{ label: "All pools", value: "" }, ...QUESTION_POOL_OPTIONS];

export const SORT_OPTIONS: Array<{ label: string; value: QueueOrder }> = [
  { label: "Oldest upload first", value: "oldest" },
  { label: "Newest upload first", value: "newest" },
  { label: "Latest exam year first", value: "year_desc" },
  { label: "Earliest exam year first", value: "year_asc" },
];

function yearLabel(year: string) {
  return year === NO_YEAR ? "No year" : year;
}

/**
 * Menu options from the counts. A choice that is no longer among them (its
 * last question was just published) is kept with a count of 0, so the menu
 * still says what is picked instead of going blank.
 */
function withCounts(
  allLabel: string,
  rows: Array<{ value: string; label: string; count: number }> | undefined,
  selected: string,
  labelOf: (value: string) => string,
): CustomSelectOption[] {
  const options: CustomSelectOption[] = rows
    ? rows.map((row) => ({ label: row.label, value: row.value, hint: formatInteger(row.count) }))
    : [];
  if (selected && !options.some((option) => option.value === selected)) {
    options.push({ label: labelOf(selected), value: selected, hint: rows ? "0" : undefined });
  }
  const all = rows?.reduce((sum, row) => sum + row.count, 0);
  return [{ label: allLabel, value: "", hint: all === undefined ? undefined : formatInteger(all) }, ...options];
}

type ReviewFiltersBarProps = {
  filters: ReviewFilters;
  onChange: (patch: Partial<ReviewFilters>) => void;
  facets: QuestionFacetsResponse | undefined;
  institutionCode: string;
  institutions: AdminInstitutionListItem[] | undefined;
  onInstitutionChange: (code: string) => void;
  view: ReviewView;
  onViewChange: (view: ReviewView) => void;
  /** How many questions the filters match, once known. */
  total: number | null;
};

export function ReviewFiltersBar({
  filters,
  onChange,
  facets,
  institutionCode,
  institutions,
  onInstitutionChange,
  view,
  onViewChange,
  total,
}: ReviewFiltersBarProps) {
  const subjectOptions = useMemo(
    () =>
      withCounts(
        "All subjects",
        facets?.subjects.map((row) => ({ value: row.subject, label: row.subject, count: row.count })),
        filters.subject,
        (subject) => subject,
      ),
    [facets, filters.subject],
  );

  const yearOptions = useMemo(
    () =>
      withCounts(
        "All years",
        facets?.years.map((row) => {
          const value = row.year === null ? NO_YEAR : String(row.year);
          return { value, label: yearLabel(value), count: row.count };
        }),
        filters.year,
        yearLabel,
      ),
    [facets, filters.year],
  );

  const chips: Array<{ label: string; clear: Partial<ReviewFilters> }> = [];
  if (filters.subject) chips.push({ label: filters.subject, clear: { subject: "" } });
  if (filters.year) chips.push({ label: yearLabel(filters.year), clear: { year: "" } });
  if (filters.status !== DEFAULT_FILTERS.status) {
    chips.push({
      label: STATUS_OPTIONS.find((option) => option.value === filters.status)?.label ?? filters.status,
      clear: { status: DEFAULT_FILTERS.status },
    });
  }
  if (filters.pool) {
    chips.push({
      label: POOL_OPTIONS.find((option) => option.value === filters.pool)?.label ?? filters.pool,
      clear: { pool: "" },
    });
  }
  if (filters.picture) {
    chips.push({
      label: PICTURE_OPTIONS.find((option) => option.value === filters.picture)?.label ?? filters.picture,
      clear: { picture: "" },
    });
  }

  const filterCount = activeFilterCount(filters);
  const sortLabel = SORT_OPTIONS.find((option) => option.value === filters.order)?.label;

  return (
    <section
      aria-label="Filters"
      className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]"
    >
      <div className="grid gap-3 p-3 sm:p-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]">
        <InstitutionSelect
          value={institutionCode}
          onValueChange={onInstitutionChange}
          institutions={institutions}
        />
        <FieldShell label="Subject">
          <CustomSelect
            aria-label="Filter by subject"
            value={filters.subject}
            onValueChange={(subject) => onChange({ subject })}
            options={subjectOptions}
          />
        </FieldShell>
        <FieldShell label="Exam year">
          <CustomSelect
            aria-label="Filter by exam year"
            value={filters.year}
            onValueChange={(year) => onChange({ year })}
            options={yearOptions}
          />
        </FieldShell>
        <FieldShell label="Status">
          <CustomSelect
            aria-label="Which review statuses to show"
            value={filters.status}
            onValueChange={(status) => onChange({ status: status as ReviewFilters["status"] })}
            options={STATUS_OPTIONS}
          />
        </FieldShell>
        <FieldShell label="Pool">
          <CustomSelect
            aria-label="Filter by pool"
            value={filters.pool}
            onValueChange={(pool) => onChange({ pool })}
            options={POOL_OPTIONS}
          />
        </FieldShell>
        <FieldShell label="Pictures">
          <CustomSelect
            aria-label="Filter by pictures still to come"
            value={filters.picture}
            onValueChange={(picture) => onChange({ picture: picture as ReviewFilters["picture"] })}
            options={PICTURE_OPTIONS}
          />
        </FieldShell>
        <FieldShell label="Sort">
          <CustomSelect
            aria-label="Order of the queue"
            value={filters.order}
            onValueChange={(order) => onChange({ order: order as QueueOrder })}
            options={SORT_OPTIONS}
          />
        </FieldShell>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sb-border)] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]" aria-live="polite">
            {total === null ? (
              "Counting…"
            ) : (
              <>
                <span className="sb-nums font-medium text-[var(--sb-text)]">{formatInteger(total)}</span>{" "}
                {total === 1 ? "question" : "questions"}
                <span className="text-[var(--sb-text-tertiary)]"> · {sortLabel?.toLowerCase()}</span>
              </>
            )}
          </p>

          {chips.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-1.5" aria-label="Filters in use">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <button
                    type="button"
                    onClick={() => onChange(chip.clear)}
                    aria-label={`Remove filter: ${chip.label}`}
                    className={cn(
                      "group inline-flex h-7 items-center gap-1 rounded-[var(--sb-radius-full)] border border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] pl-2.5 pr-1.5",
                      "text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-accent-text)] transition-colors duration-[var(--sb-duration-fast)]",
                      "hover:border-[var(--sb-accent)]",
                    )}
                  >
                    {chip.label}
                    <X className="h-3 w-3 opacity-60 group-hover:opacity-100" aria-hidden />
                  </button>
                </li>
              ))}
              {filterCount > 1 ? (
                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange({ ...DEFAULT_FILTERS, order: filters.order })
                    }
                  >
                    Clear all
                  </Button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="View"
          className="flex gap-1 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-1"
        >
          <Button
            type="button"
            variant={view === "queue" ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={view === "queue"}
            onClick={() => onViewChange("queue")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Queue
          </Button>
          <Button
            type="button"
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>
      </div>
    </section>
  );
}
