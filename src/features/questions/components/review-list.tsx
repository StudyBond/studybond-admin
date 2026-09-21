"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MathMarkdown } from "@/components/ui/math-markdown";
import type { QuestionListItem } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format";
import { Eye, Library, ShieldCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

/**
 * The scannable second view onto the same review queue: many rows at once,
 * rendered rather than raw, with bulk publish and bulk verify for a batch
 * that's already known to be fine. `href` and DataTable's own `selection`
 * are mutually exclusive, so the per-row jump into the guided reviewer is
 * an explicit button in its own column rather than a whole-row link.
 */

type ReviewListProps = {
  questions: QuestionListItem[];
  isLoading: boolean;
  error?: unknown;
  onRetry: () => void;
  onOpen: (id: number) => void;
  onBulkPublish: (ids: number[]) => Promise<unknown>;
  onBulkVerify: (ids: number[]) => Promise<unknown>;
  isBulkUpdating: boolean;
};

export function ReviewList({
  questions,
  isLoading,
  error,
  onRetry,
  onOpen,
  onBulkPublish,
  onBulkVerify,
  isBulkUpdating,
}: ReviewListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );

  const toggleSelect = useCallback((id: string | number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const areAllSelected =
    questions.length > 0 && questions.every((q) => selectedIds.has(q.id));

  const toggleAll = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = questions.every((q) => next.has(q.id));
      for (const question of questions) {
        if (allSelected) next.delete(question.id);
        else next.add(question.id);
      }
      return next;
    });
  }, [questions]);

  const columns: Column<QuestionListItem>[] = useMemo(
    () => [
      {
        key: "question",
        header: "Question",
        primary: true,
        cell: (question) => (
          <div className="min-w-0">
            <div className="line-clamp-2 text-[length:var(--sb-text-sm)]">
              <MathMarkdown
                content={question.questionText}
                className="text-[var(--sb-text)] [&_.katex]:!text-[var(--sb-text)]"
              />
            </div>
            <p className="sb-nums mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              #{question.id}
            </p>
          </div>
        ),
      },
      {
        key: "subject",
        header: "Subject",
        width: "10rem",
        cell: (question) => question.subject,
      },
      {
        key: "status",
        header: "Status",
        width: "7rem",
        cell: (question) => (
          <Badge tone={question.reviewStatus === "DRAFT" ? "warning" : "info"}>
            {question.reviewStatus === "DRAFT" ? "Draft" : "Verified"}
          </Badge>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        showFrom: "lg",
        width: "9rem",
        cell: (question) => formatDate(question.updatedAt),
      },
      {
        key: "open",
        header: "",
        width: "6rem",
        cell: (question) => (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpen(question.id)}
          >
            <Eye className="h-3.5 w-3.5" />
            Review
          </Button>
        ),
      },
    ],
    [onOpen],
  );

  const selectedCount = selectedIds.size;
  const selectedNumericIds = useMemo(
    () => [...selectedIds] as number[],
    [selectedIds],
  );

  return (
    <div className="space-y-3">
      {selectedCount > 0 ? (
        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-accent-ring)] bg-[var(--sb-surface-2)] p-3 shadow-[var(--sb-shadow)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
            {selectedCount} question{selectedCount === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onBulkVerify(selectedNumericIds)}
              disabled={isBulkUpdating}
              isLoading={isBulkUpdating}
            >
              {!isBulkUpdating ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
              Mark verified
            </Button>
            {/* Confirmed: publishing at once changes what many students see
                immediately. Verifying has no student-facing effect either
                way, so it stays a plain action. */}
            <ConfirmButton
              variant="primary"
              size="sm"
              confirmLabel={`Publish ${selectedCount} question${selectedCount === 1 ? "" : "s"}?`}
              onConfirm={() => onBulkPublish(selectedNumericIds)}
              disabled={isBulkUpdating}
              isLoading={isBulkUpdating}
            >
              Publish
            </ConfirmButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        caption="Questions awaiting review"
        items={questions}
        columns={columns}
        getKey={(question) => question.id}
        selection={{
          selectedIds,
          onToggle: toggleSelect,
          onToggleAll: toggleAll,
          areAllSelected,
          getLabel: (item) =>
            `Select question ${(item as QuestionListItem).id}`,
        }}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyIcon={<Library className="h-4 w-4" />}
        emptyTitle="Nothing waiting on review"
        emptyDescription="Every question in this scope is already published."
      />
    </div>
  );
}
