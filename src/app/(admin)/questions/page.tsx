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
import { GroupBadge } from "@/features/questions/components/group-badge";
import {
  useAdminQuestions,
  type QuestionKindFilter,
} from "@/features/questions/hooks/use-admin-questions";
import { useQuestionYears } from "@/features/questions/hooks/use-question-years";
import type { QuestionSearchScope } from "@/lib/api/types";
import { formatDate, formatInteger } from "@/lib/utils/format";
import {
  getQuestionPoolLabel,
  getQuestionTypeLabel,
  QUESTION_POOL_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
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

const KIND_FILTER_OPTIONS: Array<{ label: string; value: "" | QuestionKindFilter }> = [
  { label: "All rows", value: "" },
  { label: "Ordinary questions", value: "standalone" },
  { label: "Shared diagrams", value: "parent" },
  { label: "Use a shared diagram", value: "child" },
];

/**
 * Where a search looks. The backend compares against a flattened copy of the
 * text, so LaTeX and markdown never have to be typed — this only narrows
 * which fields are compared, for when a broad search gets noisy.
 */
const SEARCH_SCOPE_OPTIONS: Array<{ label: string; value: QuestionSearchScope }> =
  [
    { label: "Everywhere", value: "all" },
    { label: "Question only", value: "question" },
    { label: "Answer options", value: "options" },
    { label: "Explanation", value: "explanation" },
  ];

/**
 * Marks the matched word inside a snippet. The comparison ignores case:
 * the snippet keeps the text as it was written, while the search word is
 * always lowercase.
 */
function markTerm(snippet: string, term: string): React.ReactNode {
  if (!term) return snippet;

  const pieces: React.ReactNode[] = [];
  const haystack = snippet.toLowerCase();
  let from = 0;

  for (;;) {
    const at = haystack.indexOf(term, from);
    if (at < 0) break;
    if (at > from) pieces.push(snippet.slice(from, at));
    pieces.push(
      <mark
        key={at}
        className="rounded-[2px] bg-[var(--sb-accent-ring)] px-0.5 text-[var(--sb-text)]"
      >
        {snippet.slice(at, at + term.length)}
      </mark>,
    );
    from = at + term.length;
  }

  pieces.push(snippet.slice(from));
  return pieces;
}

export default function QuestionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState<QuestionSearchScope>("all");
  const [subject, setSubject] = useState("");
  const [questionPool, setQuestionPool] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [year, setYear] = useState("");
  const [kind, setKind] = useState<"" | QuestionKindFilter>("");

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
    searchIn: debouncedSearch ? searchIn : undefined,
    subject: debouncedSubject || undefined,
    questionPool: questionPool || undefined,
    questionType: questionType || undefined,
    reviewStatus: reviewStatus || undefined,
    year: year ? Number(year) : undefined,
    kind: kind || undefined,
  });

  const content = overviewQuery.data?.content;
  const questions = questionsQuery.data?.questions ?? [];
  const pagination = questionsQuery.data?.meta;

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      debouncedSubject ||
      questionPool ||
      questionType ||
      reviewStatus ||
      year ||
      kind,
  );

  function clearFilters() {
    setSearch("");
    setSearchIn("all");
    setSubject("");
    setQuestionPool("");
    setQuestionType("");
    setReviewStatus("");
    setYear("");
    setKind("");
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

          {/* Only sent when the search words are not in the text above, so
              a row never repeats what it already shows. */}
          {question.searchMatch ? (
            <p className="mt-1 line-clamp-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
              <span className="text-[var(--sb-text-tertiary)]">
                {question.searchMatch.label} ·{" "}
              </span>
              {markTerm(question.searchMatch.snippet, question.searchMatch.term)}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="sb-nums text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              #{question.id}
            </span>
            <GroupBadge question={question} />
          </div>
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
      key: "status",
      header: "Status",
      width: "7rem",
      cell: (question) =>
        question.reviewStatus === "PUBLISHED" ? (
          <span className="text-[var(--sb-text-tertiary)]">Published</span>
        ) : (
          <Badge tone={question.reviewStatus === "DRAFT" ? "warning" : "info"}>
            {question.reviewStatus === "DRAFT" ? "Draft" : "Verified"}
          </Badge>
        ),
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
            placeholder="Search questions, options, explanations"
            aria-label="Search the question bank"
          />
        }
      >
        {/* Only useful once something is being searched. */}
        {search.trim() ? (
          <FieldShell label="Search in">
            <CustomSelect
              aria-label="Choose which parts of a question to search"
              value={searchIn}
              onValueChange={(value) => {
                setSearchIn(value as QuestionSearchScope);
                setPage(1);
              }}
              options={SEARCH_SCOPE_OPTIONS}
              placeholder="Everywhere"
            />
          </FieldShell>
        ) : null}

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

        <FieldShell label="Status">
          <CustomSelect
            aria-label="Filter by review status"
            value={reviewStatus}
            onValueChange={applyFilter(setReviewStatus)}
            options={[
              { label: "All statuses", value: "" },
              ...REVIEW_STATUS_OPTIONS,
            ]}
            placeholder="All statuses"
          />
        </FieldShell>

        <FieldShell label="Kind">
          <CustomSelect
            aria-label="Filter by kind of row"
            value={kind}
            onValueChange={(value) => {
              setKind(value as "" | QuestionKindFilter);
              setPage(1);
            }}
            options={KIND_FILTER_OPTIONS}
            placeholder="All rows"
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

      {/* Says when the list is not a plain match for what was typed, so a
          corrected or word-by-word result never passes for an ordinary one. */}
      {questionsQuery.data?.searchMode === "corrected" ? (
        <div role="status" className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] px-3 py-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          <p>
            No matches for{" "}
            <span className="font-medium text-[var(--sb-text)]">
              &ldquo;{debouncedSearch}&rdquo;
            </span>
            . Showing results for{" "}
            <span className="font-medium text-[var(--sb-text)]">
              &ldquo;{questionsQuery.data.correctedTerm}&rdquo;
            </span>
            .
          </p>
          {questionsQuery.data.alternativeTerms?.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                Also try:
              </span>
              {questionsQuery.data.alternativeTerms.map((alternative) => (
                <Button
                  key={alternative}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch(alternative);
                    setPage(1);
                  }}
                >
                  {alternative}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : questionsQuery.data?.searchMode === "allWords" ? (
        <p role="status" className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] px-3 py-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          No exact match for the phrase{" "}
          <span className="font-medium text-[var(--sb-text)]">
            &ldquo;{debouncedSearch}&rdquo;
          </span>
          . Showing questions that contain all its main words.
        </p>
      ) : null}

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
