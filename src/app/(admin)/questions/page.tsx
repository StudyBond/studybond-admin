"use client";

import Link from "next/link";
import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { useAdminQuestions } from "@/features/questions/hooks/use-admin-questions";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { formatCompactNumber, formatDateTime, formatInteger } from "@/lib/utils/format";
import { getQuestionPoolLabel, getQuestionTypeLabel, QUESTION_POOL_OPTIONS, QUESTION_TYPE_OPTIONS } from "@/lib/utils/questions";
import { CustomSelect } from "@/components/ui/custom-select";
import { ArrowRight, ChevronLeft, ChevronRight, FileUp, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function QuestionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [questionPool, setQuestionPool] = useState("");
  const [questionType, setQuestionType] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const debouncedSubject = useDebouncedValue(subject.trim(), 350);

  const overviewQuery = useAdminOverview();
  const questionsQuery = useAdminQuestions({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    subject: debouncedSubject || undefined,
    questionPool: questionPool || undefined,
    questionType: questionType || undefined,
  });

  const overview = overviewQuery.data;
  const questions = questionsQuery.data?.questions ?? [];
  const pagination = questionsQuery.data?.meta;

  const metrics = useMemo(
    () =>
      overview
        ? [
            {
              label: "Total questions",
              value: formatCompactNumber(overview.content.totalQuestions),
              delta: `${formatInteger(questionsQuery.data?.meta.total ?? 0)} matched filters`,
              tone: "cyan" as const,
            },
            {
              label: "Free exam pool",
              value: formatInteger(overview.content.freeExamQuestions),
              delta: "Available to free-tier learners",
              tone: "amber" as const,
            },
            {
              label: "Real past questions",
              value: formatInteger(overview.content.realUiQuestions),
              delta: "Verified bank inventory",
              tone: "emerald" as const,
            },
            {
              label: "Practice questions",
              value: formatInteger(overview.content.practiceQuestions),
              delta: `${formatInteger(overview.content.pendingReports)} pending reports`,
              tone: "rose" as const,
            },
          ]
        : [],
    [overview, questionsQuery.data?.meta.total],
  );

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Questions"
        title="Question bank"
        description="Search the live question inventory, inspect source mix, and jump into create, edit, or bulk upload workflows."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/questions/new" className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]">
              <Plus className="h-4 w-4" />
              Add question
            </Link>
            <Link href="/questions/bulk-upload" className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]">
              <FileUp className="h-4 w-4" />
              Bulk upload
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(metrics.length ? metrics : new Array(4).fill(null)).map((metric, index) =>
          metric ? (
            <MetricCard key={metric.label} {...metric} className="admin-enter" style={{ animationDelay: `${index * 80}ms` }} />
          ) : (
            <Surface key={index} className="h-[140px] p-5 shimmer-line" />
          ),
        )}
      </div>

      <Surface className="p-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="group/search flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 transition-all duration-200 focus-within:border-[color:var(--accent-cyan)]/25 focus-within:shadow-[0_0_0_3px_rgba(110,196,184,0.06)]">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)] transition-colors duration-200 group-focus-within/search:text-[color:var(--accent-cyan)]" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search prompt text..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[color:var(--muted-foreground)]/40" />
          </div>
          <input value={subject} onChange={(event) => { setSubject(event.target.value); setPage(1); }} placeholder="Filter by subject..." className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40" />
          <CustomSelect
            value={questionPool}
            onValueChange={(val) => { setQuestionPool(val); setPage(1); }}
            options={[{ label: "All pools", value: "" }, ...QUESTION_POOL_OPTIONS]}
            placeholder="All pools"
          />
          <CustomSelect
            value={questionType}
            onValueChange={(val) => { setQuestionType(val); setPage(1); }}
            options={[{ label: "All types", value: "" }, ...QUESTION_TYPE_OPTIONS]}
            placeholder="All types"
          />
        </div>
      </Surface>

      {questionsQuery.isError ? (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load questions.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage error={questionsQuery.error} fallback="Please try again." />
          </p>
        </Surface>
      ) : null}

      <Surface className="overflow-hidden p-0">
        {questionsQuery.isLoading ? (
          <div className="space-y-2 px-5 py-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : questions.length ? (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {questions.map((question: any) => (
                <Link
                  key={question.id}
                  href={`/questions/${question.id}`}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/12 hover:bg-white/[0.04]"
                >
                  <p className="line-clamp-3 font-medium text-white">{question.questionText}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">#{question.id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone="cyan">{getQuestionTypeLabel(question.questionType)}</StatusBadge>
                    <StatusBadge tone="slate">{getQuestionPoolLabel(question.questionPool)}</StatusBadge>
                    <StatusBadge tone={question.hasImage ? "emerald" : "slate"}>
                      {question.hasImage ? "has media" : "text only"}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[color:var(--muted-foreground)]">
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[10px]">Subject</p>
                      <p className="mt-1 text-sm text-white">{question.subject}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[10px]">Updated</p>
                      <p className="mt-1 text-sm text-white">
                        {question.updatedAt ? formatDateTime(question.updatedAt) : "Unavailable"}
                      </p>
                    </div>
                  </div>
                  {question.topic ? (
                    <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{question.topic}</p>
                  ) : null}
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[860px] w-full divide-y divide-white/8 text-sm">
                <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Media</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 bg-black/10">
                  {questions.map((question: any) => (
                    <tr key={question.id} className="group/row transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <Link href={`/questions/${question.id}`} className="block">
                          <p className="line-clamp-2 font-medium text-white transition group-hover/row:text-[color:var(--accent-cyan)]">
                            {question.questionText}
                          </p>
                          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">#{question.id}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone="cyan">{getQuestionTypeLabel(question.questionType)}</StatusBadge>
                          <StatusBadge tone="slate">{getQuestionPoolLabel(question.questionPool)}</StatusBadge>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-white">{question.subject}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{question.topic ?? "No topic"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={question.hasImage ? "emerald" : "slate"}>
                          {question.hasImage ? "has media" : "text only"}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-[color:var(--muted-foreground)]">
                        {question.updatedAt ? formatDateTime(question.updatedAt) : "Unavailable"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            No questions match the current filters.
          </div>
        )}
      </Surface>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button type="button" onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} disabled={page >= pagination.totalPages} className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {questions.length ? (
        <div className="flex justify-start sm:justify-end">
          <Link href={`/questions/${questions[0].id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--accent-cyan)]">
            Open latest visible record
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
