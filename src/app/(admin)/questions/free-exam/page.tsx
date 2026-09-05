"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, FieldShell, SearchField } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { FilterBar, Pagination } from "@/components/ui/toolbar";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { useAdminQuestions } from "@/features/questions/hooks/use-admin-questions";
import { useFreeExamCoverage } from "@/features/questions/hooks/use-free-exam-coverage";
import { adminFreeExamApi } from "@/lib/api/admin-free-exam";
import type { QuestionListItem } from "@/lib/api/types";
import { formatInteger } from "@/lib/utils/format";
import {
  getQuestionPoolLabel,
  QUESTION_POOL_OPTIONS,
} from "@/lib/utils/questions";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Library, RotateCcw, ShieldCheck, Star, Trophy, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Free exam pool: which real-bank questions free learners are served.
 *
 * The important fix is honesty about a backend limitation. The "Featured
 * status" filter looked like the other filters but ran in the browser, over
 * the twenty rows already fetched — `/api/questions` has no isFeaturedFree
 * parameter (questions.service.ts builds its `where` from subject, topic,
 * questionType, questionPool, hasImage, isAiGenerated, year and search
 * only). So choosing "Featured" showed the featured questions *on this
 * page*, while pagination still counted every question in the bank. You
 * could page through seeing nothing and conclude nothing was featured. It
 * is now named for what it does and says so in words while it is active.
 *
 * "Reset all free exam credits" wipes every free learner's credits and
 * subject history, calls itself irreversible, and fired on one click. It
 * confirms now.
 *
 * Selection was `onClick` on a `<tr>` with a decorative tick inside — no
 * keyboard access and nothing for a screen reader. DataTable grew real
 * checkboxes for this.
 */

const PAGE_SIZE = 20;

const FEATURED_OPTIONS = [
  { label: "Everything on this page", value: "" },
  { label: "Featured only", value: "featured" },
  { label: "Not featured", value: "not-featured" },
];

/** A full pool is healthy; an empty one is the reason to be on this page. */
function coverageTone(ratio: number): BadgeTone {
  if (ratio >= 1) return "success";
  if (ratio >= 0.5) return "warning";
  return "danger";
}

function coveragePercent(count: number, cap: number) {
  if (cap <= 0) return 100;
  return Math.min(100, Math.round((count / cap) * 100));
}

export default function FreeExamPage() {
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const isSuperadmin = session?.user?.role === "SUPERADMIN";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [questionPool, setQuestionPool] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );

  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const debouncedSubject = useDebouncedValue(subject.trim(), 350);

  const questionsQuery = useAdminQuestions({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    subject: debouncedSubject || undefined,
    questionPool: questionPool || undefined,
    questionType: "real_past_question",
  });
  const coverageQuery = useFreeExamCoverage();

  const questions = useMemo(
    () => questionsQuery.data?.questions ?? [],
    [questionsQuery.data],
  );
  const pagination = questionsQuery.data?.meta;
  const coverage = useMemo(
    () => coverageQuery.data?.subjects ?? [],
    [coverageQuery.data],
  );

  /* Browser-side, over this page only — see the note at the top. */
  const visibleQuestions = useMemo(() => {
    if (!featuredFilter) return questions;
    const wantFeatured = featuredFilter === "featured";
    return questions.filter(
      (question) => Boolean(question.isFeaturedFree) === wantFeatured,
    );
  }, [questions, featuredFilter]);

  const totalFeatured = coverage.reduce(
    (sum, row) => sum + row.featuredCount,
    0,
  );
  const subjectsCovered = coverage.length;
  const subjectsFull = coverage.filter((row) => row.isFull).length;

  const toggleSelect = useCallback((id: string | number) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const areAllVisibleSelected =
    visibleQuestions.length > 0 &&
    visibleQuestions.every((question) => selectedIds.has(question.id));

  const toggleAllVisible = useCallback(() => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const allSelected = visibleQuestions.every((question) =>
        next.has(question.id),
      );
      for (const question of visibleQuestions) {
        if (allSelected) next.delete(question.id);
        else next.add(question.id);
      }
      return next;
    });
  }, [visibleQuestions]);

  const toggleMutation = useMutation({
    mutationFn: (params: { questionIds: number[]; featured: boolean }) =>
      adminFreeExamApi.toggleQuestions(params),
    onSuccess: async (data) => {
      toast.success(data.message);
      setSelectedIds(new Set());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "free-exam"] }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not change the free pool", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!stepUp?.stepUpToken) throw new Error("Step-up required.");
      return adminFreeExamApi.resetCredits({ stepUpToken: stepUp.stepUpToken });
    },
    onSuccess: async (data) => {
      toast.success(data.message);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => {
      toast.error("Could not reset credits", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const selectedCount = selectedIds.size;

  const columns: Column<QuestionListItem>[] = [
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
      key: "pool",
      header: "Pool",
      width: "11rem",
      showFrom: "lg",
      cell: (question) => (
        <Badge tone="neutral">
          {getQuestionPoolLabel(question.questionPool)}
        </Badge>
      ),
    },
    {
      key: "featured",
      header: "Free exam",
      width: "9rem",
      cell: (question) =>
        question.isFeaturedFree ? (
          <Badge tone="brand">Featured</Badge>
        ) : (
          <span className="text-[var(--sb-text-tertiary)]">Not featured</span>
        ),
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Free exam pool"
        description="These are the questions free learners get. Pick from the real past-question bank, keeping each subject topped up to its cap."
        action={
          <>
            <Button
              asChild
              href="/questions/free-exam/leaderboard"
              variant="secondary"
            >
              <Trophy className="h-4 w-4" />
              Leaderboard
            </Button>
            <Button asChild href="/questions" variant="secondary">
              <Library className="h-4 w-4" />
              Question bank
            </Button>
          </>
        }
      />

      <StatGrid>
        <StatCard
          label="Featured questions"
          value={formatInteger(totalFeatured)}
          hint="Served to free learners"
        />
        <StatCard
          label="Subjects covered"
          value={formatInteger(subjectsCovered)}
          hint={`${formatInteger(subjectsFull)} are at full capacity`}
        />
        <StatCard
          label="Questions matched"
          value={formatInteger(pagination?.total ?? 0)}
          hint="Real-bank questions in this filter"
        />
        <StatCard
          label="Selected"
          value={formatInteger(selectedCount)}
          hint={
            selectedCount
              ? "Use the bar below to act on them"
              : "Tick rows to choose questions"
          }
        />
      </StatGrid>

      {/* ── Bulk actions ──────────────────────────────────────
          Sticky, so it stays reachable while working down a long
          list. Previously it scrolled away with the page. */}
      {selectedCount > 0 ? (
        <div className="sticky top-0 z-30 flex flex-col gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-accent-ring)] bg-[var(--sb-surface-2)] p-3 shadow-[var(--sb-shadow)] sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <p className="text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
            {formatInteger(selectedCount)} question
            {selectedCount === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                toggleMutation.mutate({
                  questionIds: [...selectedIds] as number[],
                  featured: true,
                })
              }
              disabled={toggleMutation.isPending}
              isLoading={toggleMutation.isPending}
            >
              <Star className="h-3.5 w-3.5" />
              Add to free pool
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                toggleMutation.mutate({
                  questionIds: [...selectedIds] as number[],
                  featured: false,
                })
              }
              disabled={toggleMutation.isPending}
            >
              <X className="h-3.5 w-3.5" />
              Remove from pool
            </Button>
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

      <div className="space-y-2">
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
              onValueChange={(value) => {
                setQuestionPool(value);
                setPage(1);
              }}
              options={[
                { label: "All pools", value: "" },
                ...QUESTION_POOL_OPTIONS,
              ]}
              placeholder="All pools"
            />
          </FieldShell>

          {/* Named for what it actually does, not for what it looks like. */}
          <FieldShell label="Narrow this page">
            <CustomSelect
              aria-label="Narrow the questions shown on this page"
              value={featuredFilter}
              onValueChange={setFeaturedFilter}
              options={FEATURED_OPTIONS}
              placeholder="Everything on this page"
            />
          </FieldShell>
        </FilterBar>

        {featuredFilter ? (
          <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            Showing {visibleQuestions.length} of the {questions.length}{" "}
            questions on this page. The backend cannot search by featured
            status yet, so this does not reach other pages.
          </p>
        ) : null}
      </div>

      <DataTable
        caption="Real past questions available for the free exam pool"
        items={visibleQuestions}
        columns={columns}
        getKey={(question) => question.id}
        selection={{
          selectedIds,
          onToggle: toggleSelect,
          onToggleAll: toggleAllVisible,
          areAllSelected: areAllVisibleSelected,
          getLabel: (question) =>
            `Select question ${(question as QuestionListItem).id}`,
        }}
        isLoading={questionsQuery.isLoading}
        error={questionsQuery.isError ? questionsQuery.error : undefined}
        onRetry={() => questionsQuery.refetch()}
        emptyIcon={<Library className="h-4 w-4" />}
        emptyTitle={
          featuredFilter
            ? "Nothing on this page matches"
            : "No questions match these filters"
        }
        emptyDescription={
          featuredFilter
            ? "Try another page, or set this page's filter back to Everything."
            : "Try a broader subject, or clear the search."
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

      {/* ── Coverage ──────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle
          title="Coverage by subject"
          description="How full each subject's free pool is against its cap."
          action={
            subjectsCovered > 0 ? (
              <Badge
                tone={subjectsFull === subjectsCovered ? "success" : "warning"}
              >
                {subjectsFull} of {subjectsCovered} full
              </Badge>
            ) : null
          }
        />

        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          {coverageQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : coverage.length ? (
            <ul className="space-y-2.5">
              {coverage.map((row) => {
                const percent = coveragePercent(row.featuredCount, row.cap);
                const tone = coverageTone(
                  row.cap > 0 ? row.featuredCount / row.cap : 1,
                );
                return (
                  <li
                    key={`${row.institutionId}-${row.subject}`}
                    className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                          {row.subject}
                        </p>
                        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          {row.institutionCode}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="sb-nums text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                          {row.featuredCount}/{row.cap}
                        </span>
                        <Badge tone={tone}>
                          {row.isFull ? "Full" : `${percent}%`}
                        </Badge>
                      </div>
                    </div>

                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${row.subject} pool ${percent}% full`}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-[var(--sb-duration-slow)]"
                        style={{
                          width: `${percent}%`,
                          background:
                            tone === "success"
                              ? "var(--sb-success)"
                              : tone === "warning"
                                ? "var(--sb-warning)"
                                : "var(--sb-danger)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
              Nothing is featured yet. Tick some questions above and choose
              &quot;Add to free pool&quot;.
            </p>
          )}
        </div>
      </section>

      {/* ── Credit reset ──────────────────────────────────── */}
      {isSuperadmin ? (
        <section className="space-y-3">
          <SectionTitle title="Free exam credits" />
          <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] bg-[rgba(248,113,113,0.12)] text-[var(--sb-danger)]">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                  Reset everyone&apos;s free exam credits
                </p>
                <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                  Puts every free learner back to 4 credits and wipes the
                  record of which subjects they have already used. This cannot
                  be undone.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <ConfirmButton
                    variant="danger"
                    confirmLabel="Yes, reset every learner"
                    onConfirm={() => resetMutation.mutate()}
                    disabled={!isStepUpActive || resetMutation.isPending}
                    isLoading={resetMutation.isPending}
                    icon={<RotateCcw className="h-4 w-4" />}
                  >
                    Reset credits
                  </ConfirmButton>

                  {!isStepUpActive ? (
                    <Button
                      asChild
                      href="/step-up?next=/questions/free-exam&intent=Free%20exam%20credit%20reset"
                      variant="secondary"
                      size="sm"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verify first
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
