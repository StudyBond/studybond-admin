"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/field";
import { MathMarkdown } from "@/components/ui/math-markdown";
import { useAdminQuestions } from "@/features/questions/hooks/use-admin-questions";
import { cn } from "@/lib/utils/cn";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { ExternalLink, ImageIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Choose the shared diagram or passage a question uses.
 *
 * Replaces a box that asked for a raw database number. Nobody knows the id of
 * the diagram they want; they know what it looks like and which subject it
 * is in. So this searches the shared rows by their text, narrowed to the
 * subject being edited, and shows the picture next to the choice so the right
 * one is obvious before it is picked.
 */

export type ParentSummary = {
  id: number;
  questionText: string;
  imageUrl: string | null;
  subject?: string | null;
  year?: number | null;
  childCount?: number | null;
};

type ParentPickerProps = {
  selected: ParentSummary | null;
  onSelect: (parent: ParentSummary) => void;
  onClear: () => void;
  /** Narrows the search: a question can only use a diagram in its own subject. */
  subject?: string;
  institutionCode?: string;
  error?: string;
};

function Thumb({ url }: { url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="h-16 w-16 shrink-0 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg)] object-contain"
    />
  ) : (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] border border-dashed border-[var(--sb-border)] text-[var(--sb-text-tertiary)]">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

function Meta({ parent }: { parent: ParentSummary }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className="sb-nums text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
        #{parent.id}
      </span>
      {parent.subject ? <Badge tone="neutral">{parent.subject}</Badge> : null}
      {parent.year ? <Badge tone="neutral">{parent.year}</Badge> : null}
      {parent.childCount != null ? (
        <Badge tone="info">
          {parent.childCount} question{parent.childCount === 1 ? "" : "s"}
        </Badge>
      ) : null}
    </div>
  );
}

export function ParentPicker({
  selected,
  onSelect,
  onClear,
  subject,
  institutionCode,
  error,
}: ParentPickerProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const isChoosing = !selected || isChanging;

  const resultsQuery = useAdminQuestions(
    {
      kind: "parent",
      search: debouncedSearch || undefined,
      subject: subject?.trim() || undefined,
      institutionCode: institutionCode?.trim() || undefined,
      limit: 8,
      page: 1,
    },
    { enabled: isChoosing },
  );
  const results = resultsQuery.data?.questions ?? [];

  if (selected && !isChanging) {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "flex items-start gap-3 rounded-[var(--sb-radius)] border bg-[var(--sb-bg-inset)] p-3",
            error ? "border-[var(--sb-danger)]" : "border-[var(--sb-border)]",
          )}
        >
          <Thumb url={selected.imageUrl} />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-3 text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
              <MathMarkdown content={selected.questionText} />
            </div>
            <Meta parent={selected} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsChanging(true)}
          >
            Change
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Remove
          </Button>
          <Button
            asChild
            href={`/questions/${selected.id}`}
            variant="ghost"
            size="sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <SearchField
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search shared diagrams by their text"
        aria-label="Search shared diagrams"
      />
      {subject?.trim() ? (
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          Showing {subject.trim()} only, since a question and its diagram must
          be in the same subject.
        </p>
      ) : (
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          Fill in the subject to narrow this list.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-[length:var(--sb-text-xs)] text-[var(--sb-danger)]">
          {error}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {resultsQuery.isLoading ? (
          <li className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
            Searching…
          </li>
        ) : results.length === 0 ? (
          <li className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] p-3 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            No shared diagram found.{" "}
            <Link
              href="/questions/new?kind=parent"
              className="inline-flex items-center gap-1 font-medium text-[var(--sb-accent)] hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add one first
            </Link>
          </li>
        ) : (
          results.map((row) => {
            const summary: ParentSummary = {
              id: row.id,
              questionText: row.questionText,
              imageUrl: row.imageUrl ?? null,
              subject: row.subject,
              year: row.year ?? null,
              childCount: row.childCount ?? 0,
            };
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(summary);
                    setIsChanging(false);
                    setSearch("");
                  }}
                  className="flex w-full items-start gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-2.5 text-left transition-colors hover:border-[var(--sb-accent)]"
                >
                  <Thumb url={summary.imageUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                      {summary.questionText}
                    </span>
                    <Meta parent={summary} />
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {selected && isChanging ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsChanging(false)}
        >
          Keep the current one
        </Button>
      ) : null}
    </div>
  );
}
