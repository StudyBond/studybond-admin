"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, FieldShell, SearchField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { FilterBar, Pagination } from "@/components/ui/toolbar";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { useAdminQuestions } from "@/features/questions/hooks/use-admin-questions";
import { useQuestionYears } from "@/features/questions/hooks/use-question-years";
import { formatDate, formatInteger } from "@/lib/utils/format";
import {
  getQuestionPoolLabel,
  getQuestionTypeLabel,
  QUESTION_POOL_OPTIONS,
  QUESTION_TYPE_OPTIONS,
} from "@/lib/utils/questions";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { FileUp, Library, Plus } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Question bank.
 *
 * The three worst things about the old page, in order:
 *
 * 1. When the overview request failed or had not landed, the stat row
 *    filled itself with invented values — "Free exam pool: Live", "Real
 *    past questions: Verified", "Practice questions: Active". Those are
 *    not numbers, and they were displayed in the same slot, at the same
 *    size, as the real counts. An admin could not tell a working page
 *    from a broken one. Missing data now reads as missing: skeletons
 *    while loading, one honest line if the request fails.
 *
 * 2. The footer carried "Open latest visible record", which linked to
 *    whichever row happened to be first on the current page. It was not
 *    the latest record, and every row was already a link.
 *
 * 3. The filter row was `xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]`, so
 *    five filters stacked to full width on everything below 1280px, then
 *    snapped to five columns at once. FilterBar reflows them continuously.
 *
 * Colour also stopped being decorative. Year was an amber pill with a
 * calendar icon in the table and a plain badge in the cards — the same
 * value drawn two ways, in a colour that means "warning" everywhere else.
 * It is now just a number.
 */

const PAGE_SIZE = 20;

export default function QuestionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [questionPool, setQuestionPool] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [year, setYear] = useState("");

  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const debouncedSubject = useDebouncedValue(subject.trim(), 350);

  /** Any filter change returns to page 1 — page 7 of a new result set is a dead end. */
  function applyFilter(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setPage(1);
    };
  }

  const overviewQuery = useAdminOverview();
  const yearsQuery = useQuestionYears();

  const yearOptions = useMemo(
    () => [
      { label: "All years", value: "" },
      ...(yearsQuery.data ?? []).map((value) => ({
        label: String(value),
        value: String(value),
      })),
    ],
    [yearsQuery.data],
  );

  const questionsQuery = useAdminQuestions({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    subject: debouncedSubject || undefined,
    questionPool: questionPool || undefined,
    questionType: questionType || undefined,
    year: year ? Number(year) : undefined,
  });

  const content = overviewQuery.data?.content;
  const questions = questionsQuery.data?.questions ?? [];
  const pagination = questionsQuery.data?.meta;

  const hasActiveFilters = Boolean(
    debouncedSearch || debouncedSubject || questionPool || questionType || year,
  );

  function clearFilters() {
    setSearch("");
    setSubject("");
    setQuestionPool("");
    setQuestionType("");
    setYear("");
    setPage(1);
  }

  const columns: Column<(typeof questions)[number]>[] = [
    {
      key: "question",
      header: "Question",
      primary: true,
      cell: (question) => (
        <div className="min-w-0">
          <p className="line-clamp-2">{question.questionText}</p>
          <p className="sb-nums mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            #{question.id}
          </p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      width: "12rem",
      cell: (question) => (
        <div className="min-w-0">
          <Badge tone="neutral">
            {getQuestionPoolLabel(question.questionPool)}
          </Badge>
          <p className="mt-1 truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {getQuestionTypeLabel(question.questionType)}
          </p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      width: "12rem",
      cell: (question) => (
        <div className="min-w-0">
          <p className="truncate text-[var(--sb-text)]">{question.subject}</p>
          <p className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {question.topic ?? "No topic"}
          </p>
        </div>
      ),
    },
    {
      key: "year",
      header: "Year",
      numeric: true,
      width: "5.5rem",
      cell: (question) =>
        question.year ?? <span className="text-[var(--sb-text-tertiary)]">—</span>,
    },
    {
      key: "media",
      header: "Media",
      width: "7rem",
      /* Only images are worth flagging — they are the thing that can be
         broken or missing. A text-only question is the normal case. */
      cell: (question) =>
        question.hasImage ? (
          <Badge tone="info">Image</Badge>
        ) : (
          <span className="text-[var(--sb-text-tertiary)]">Text only</span>
        ),
    },
    {
      key: "updated",
      header: "Updated",
      showFrom: "lg",
      width: "10rem",
      cell: (question) => formatDate(question.updatedAt),
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Question bank"
        description="Every question learners can be served. Filter to find one, or add to the bank."
        action={
          <>
            <Button asChild href="/questions/new" variant="secondary">
              <Plus className="h-4 w-4" />
              Add question
            </Button>
            <Button asChild href="/questions/bulk-upload" variant="secondary">
              <FileUp className="h-4 w-4" />
              Bulk upload
            </Button>
          </>
        }
      />

      {/* ── Inventory ─────────────────────────────────────────
          These four counts come from the analytics overview, not from
          the filtered list below. If that request fails, say so rather
          than filling the boxes with words. */}
      {overviewQuery.isLoading ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </StatGrid>
      ) : content ? (
        <StatGrid>
          <StatCard
            label="Total questions"
            value={formatInteger(content.totalQuestions)}
            hint="Across every pool"
          />
          <StatCard
            label="Free exam pool"
            value={formatInteger(content.freeExamQuestions)}
            hint="Served to free-tier learners"
          />
          <StatCard
            label="Real past questions"
            value={formatInteger(content.realUiQuestions)}
            hint="Verified bank inventory"
          />
          <StatCard
            label="Practice questions"
            value={formatInteger(content.practiceQuestions)}
            hint="Authored and AI-generated"
          />
        </StatGrid>
      ) : (
        <p className="text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
          Inventory counts are unavailable.{" "}
          <ApiErrorMessage
            error={overviewQuery.error}
            fallback="The analytics overview did not load."
          />{" "}
          The question list below is unaffected.
        </p>
      )}

      <FilterBar
        search={
          <SearchField
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search question text"
            aria-label="Search question text"
          />
        }
      >
        <FieldShell label="Subject">
          <Field
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setPage(1);
            }}
            placeholder="Any subject"
            aria-label="Filter by subject"
          />
        </FieldShell>

        <FieldShell label="Pool">
          <CustomSelect
            aria-label="Filter by pool"
            value={questionPool}
            onValueChange={applyFilter(setQuestionPool)}
            options={[{ label: "All pools", value: "" }, ...QUESTION_POOL_OPTIONS]}
            placeholder="All pools"
          />
        </FieldShell>

        <FieldShell label="Type">
          <CustomSelect
            aria-label="Filter by question type"
            value={questionType}
            onValueChange={applyFilter(setQuestionType)}
            options={[{ label: "All types", value: "" }, ...QUESTION_TYPE_OPTIONS]}
            placeholder="All types"
          />
        </FieldShell>

        <FieldShell label="Year">
          <CustomSelect
            aria-label="Filter by year"
            value={year}
            onValueChange={applyFilter(setYear)}
            options={yearOptions}
            placeholder="All years"
            disabled={yearsQuery.isLoading}
          />
        </FieldShell>
      </FilterBar>

      <DataTable
        caption="Question bank"
        items={questions}
        columns={columns}
        getKey={(question) => question.id}
        href={(question) => `/questions/${question.id}`}
        isLoading={questionsQuery.isLoading}
        error={questionsQuery.isError ? questionsQuery.error : undefined}
        onRetry={() => questionsQuery.refetch()}
        emptyIcon={<Library className="h-4 w-4" />}
        emptyTitle={
          hasActiveFilters
            ? "No questions match these filters"
            : "The question bank is empty"
        }
        emptyDescription={
          hasActiveFilters
            ? "Try a broader subject, or set the pool and year back to All."
            : "Add a question, or import a batch with bulk upload."
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : (
            <Button asChild href="/questions/new" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add question
            </Button>
          )
        }
      />

      {pagination ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
