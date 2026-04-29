"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  RotateCcw,
  Search,
  ShieldOff,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { CustomSelect } from "@/components/ui/custom-select";

import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { useAdminQuestions } from "@/features/questions/hooks/use-admin-questions";
import { useFreeExamCoverage } from "@/features/questions/hooks/use-free-exam-coverage";

import { adminFreeExamApi } from "@/lib/api/admin-free-exam";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { formatInteger } from "@/lib/utils/format";
import { getQuestionPoolLabel, QUESTION_POOL_OPTIONS } from "@/lib/utils/questions";

/* ─── Helpers ───────────────────────────────────────── */

function coverageTone(ratio: number): "emerald" | "amber" | "rose" {
  if (ratio >= 1) return "emerald";
  if (ratio >= 0.5) return "amber";
  return "rose";
}

function coveragePercent(count: number, cap: number) {
  if (cap <= 0) return 100;
  return Math.min(100, Math.round((count / cap) * 100));
}

/* ─── Page ──────────────────────────────────────────── */

export default function FreeExamPage() {
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const isSuperadmin = session?.user?.role === "SUPERADMIN";

  // ── Question browser state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [questionPool, setQuestionPool] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState<string>("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const debouncedSubject = useDebouncedValue(subject.trim(), 350);

  // ── Selected IDs for bulk toggle
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Data queries
  const questionsQuery = useAdminQuestions({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    subject: debouncedSubject || undefined,
    questionPool: questionPool || undefined,
    questionType: "real_past_question",
  });
  const coverageQuery = useFreeExamCoverage();

  const questions = questionsQuery.data?.questions ?? [];
  const pagination = questionsQuery.data?.meta;
  const coverage = coverageQuery.data?.subjects ?? [];

  // ── Derived: filter questions by featured status client-side
  const filteredQuestions = useMemo(() => {
    if (!featuredFilter) return questions;
    if (featuredFilter === "featured") {
      return questions.filter((q: any) => q.isFeaturedFree === true);
    }
    return questions.filter((q: any) => !q.isFeaturedFree);
  }, [questions, featuredFilter]);

  // ── Metrics
  const totalFeatured = useMemo(
    () => coverage.reduce((sum, s) => sum + s.featuredCount, 0),
    [coverage],
  );
  const subjectsCovered = coverage.length;
  const subjectsFull = coverage.filter((s) => s.isFull).length;

  // ── Selection handlers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const q of filteredQuestions) next.add(q.id);
      return next;
    });
  }, [filteredQuestions]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: (params: { questionIds: number[]; featured: boolean }) =>
      adminFreeExamApi.toggleQuestions(params),
    onSuccess: async (data) => {
      toast.success(data.message);
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "free-exam"] });
    },
    onError: (error) => {
      toast.error("Toggle failed", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  // ── Reset mutation (SUPERADMIN only)
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
      toast.error("Reset failed", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const handleFeature = () => {
    if (selectedIds.size === 0) return;
    toggleMutation.mutate({ questionIds: [...selectedIds], featured: true });
  };
  const handleUnfeature = () => {
    if (selectedIds.size === 0) return;
    toggleMutation.mutate({ questionIds: [...selectedIds], featured: false });
  };

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Free exams"
        title="Free exam pool"
        description="Select questions from the real bank to feature in free exams. Manage per-subject coverage and reset user credits."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/questions/free-exam/leaderboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--accent-amber)]/20 bg-[color:var(--accent-amber)]/10 px-4 py-2.5 text-sm font-medium text-[#f2e0c4] transition hover:border-[color:var(--accent-amber)]/30 hover:bg-[color:var(--accent-amber)]/15"
            >
              <Trophy className="h-4 w-4" />
              Leaderboard
            </Link>
            <Link
              href="/questions"
              className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]"
            >
              <ArrowRight className="h-4 w-4" />
              Full question bank
            </Link>
          </div>
        }
      />

      {/* ── Metrics ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Featured questions"
          value={formatInteger(totalFeatured)}
          delta="Available to free users"
          tone="cyan"
          className="admin-enter"
          style={{ animationDelay: "0ms" }}
        />
        <MetricCard
          label="Subjects covered"
          value={formatInteger(subjectsCovered)}
          delta={`${formatInteger(subjectsFull)} at full capacity`}
          tone="emerald"
          className="admin-enter"
          style={{ animationDelay: "80ms" }}
        />
        <MetricCard
          label="Questions matched"
          value={formatInteger(pagination?.total ?? 0)}
          delta="Real bank questions in filter"
          tone="amber"
          className="admin-enter"
          style={{ animationDelay: "160ms" }}
        />
        <MetricCard
          label="Selected"
          value={formatInteger(selectedIds.size)}
          delta={selectedIds.size > 0 ? "Ready for action" : "Click rows to select"}
          tone="rose"
          className="admin-enter"
          style={{ animationDelay: "240ms" }}
        />
      </div>

      {/* ── Action bar ──────────────────────────────── */}
      {selectedIds.size > 0 && (
        <Surface
          glow="cyan"
          className="admin-enter flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium text-white">
            {selectedIds.size} question{selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFeature}
              disabled={toggleMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent-emerald)]/15 border border-[color:var(--accent-emerald)]/25 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#e0f0cc] transition hover:bg-[color:var(--accent-emerald)]/25 disabled:opacity-50"
            >
              <Star className="h-3.5 w-3.5" />
              Feature
            </button>
            <button
              type="button"
              onClick={handleUnfeature}
              disabled={toggleMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent-rose)]/15 border border-[color:var(--accent-rose)]/25 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f0d5d2] transition hover:bg-[color:var(--accent-rose)]/25 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Unfeature
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </Surface>
      )}

      {/* ── Filters ─────────────────────────────────── */}
      <Surface className="p-6">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <div className="group/search flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 transition-all duration-200 focus-within:border-[color:var(--accent-cyan)]/25 focus-within:shadow-[0_0_0_3px_rgba(110,196,184,0.06)]">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)] transition-colors duration-200 group-focus-within/search:text-[color:var(--accent-cyan)]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search question text..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[color:var(--muted-foreground)]/40"
            />
          </div>
          <input
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setPage(1); }}
            placeholder="Filter by subject..."
            className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40"
          />
          <CustomSelect
            value={questionPool}
            onValueChange={(val) => { setQuestionPool(val); setPage(1); }}
            options={[{ label: "All pools", value: "" }, ...QUESTION_POOL_OPTIONS]}
            placeholder="All pools"
          />
          <CustomSelect
            value={featuredFilter}
            onValueChange={(val) => { setFeaturedFilter(val); setPage(1); }}
            options={[
              { label: "All questions", value: "" },
              { label: "★ Featured free", value: "featured" },
              { label: "Not featured", value: "not-featured" },
            ]}
            placeholder="Featured status"
          />
        </div>
      </Surface>

      {/* ── Questions table ─────────────────────────── */}
      {questionsQuery.isError && (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load questions.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage error={questionsQuery.error} fallback="Please try again." />
          </p>
        </Surface>
      )}

      <Surface className="overflow-hidden p-0">
        {questionsQuery.isLoading ? (
          <div className="space-y-2 px-5 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredQuestions.length ? (
          <>
            {/* Select all bar */}
            <div className="flex items-center justify-between border-b border-white/8 bg-black/15 px-5 py-2.5">
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-xs font-medium text-[color:var(--accent-cyan)] transition hover:text-white"
              >
                Select all visible ({filteredQuestions.length})
              </button>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {selectedIds.size} selected
              </p>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 p-3 md:hidden">
              {filteredQuestions.map((q: any) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleSelect(q.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedIds.has(q.id)
                      ? "border-[color:var(--accent-cyan)]/30 bg-[color:var(--accent-cyan)]/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/12"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition ${
                      selectedIds.has(q.id)
                        ? "border-[color:var(--accent-cyan)] bg-[color:var(--accent-cyan)]/20 text-[color:var(--accent-cyan)]"
                        : "border-white/20 text-transparent"
                    }`}>
                      <Check className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-white">{q.questionText}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusBadge tone="slate">{q.subject}</StatusBadge>
                        <StatusBadge tone="slate">{getQuestionPoolLabel(q.questionPool)}</StatusBadge>
                        {q.isFeaturedFree && (
                          <StatusBadge tone="amber">★ Featured</StatusBadge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[860px] w-full divide-y divide-white/8 text-sm">
                <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  <tr>
                    <th className="w-12 px-4 py-3" />
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Pool</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 bg-black/10">
                  {filteredQuestions.map((q: any) => (
                    <tr
                      key={q.id}
                      onClick={() => toggleSelect(q.id)}
                      className={`group/row cursor-pointer transition ${
                        selectedIds.has(q.id)
                          ? "bg-[color:var(--accent-cyan)]/[0.04]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <span className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition ${
                          selectedIds.has(q.id)
                            ? "border-[color:var(--accent-cyan)] bg-[color:var(--accent-cyan)]/20 text-[color:var(--accent-cyan)]"
                            : "border-white/20 text-transparent group-hover/row:border-white/30"
                        }`}>
                          <Check className="h-3 w-3" />
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="line-clamp-2 font-medium text-white">{q.questionText}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">#{q.id}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-white">{q.subject}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{q.topic ?? "No topic"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone="slate">{getQuestionPoolLabel(q.questionPool)}</StatusBadge>
                      </td>
                      <td className="px-5 py-3.5">
                        {q.isFeaturedFree ? (
                          <StatusBadge tone="amber">★ Featured</StatusBadge>
                        ) : (
                          <StatusBadge tone="slate">—</StatusBadge>
                        )}
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

      {/* ── Pagination ──────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Coverage dashboard ──────────────────────── */}
      <Surface className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
              Coverage
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">Subject pool capacity</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              How many featured questions exist per subject vs. the configured cap.
            </p>
          </div>
          <StatusBadge tone={subjectsFull === subjectsCovered && subjectsCovered > 0 ? "emerald" : "amber"}>
            {subjectsFull}/{subjectsCovered} full
          </StatusBadge>
        </div>

        {coverageQuery.isLoading ? (
          <div className="mt-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : coverage.length ? (
          <div className="mt-5 space-y-2.5">
            {coverage.map((s) => {
              const pct = coveragePercent(s.featuredCount, s.cap);
              const tone = coverageTone(s.featuredCount / s.cap);
              return (
                <div key={`${s.institutionId}-${s.subject}`} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{s.subject}</p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">{s.institutionCode}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-white">{s.featuredCount}/{s.cap}</span>
                      <StatusBadge tone={tone}>
                        {s.isFull ? "Full" : `${pct}%`}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tone === "emerald"
                          ? "bg-[color:var(--accent-emerald)]"
                          : tone === "amber"
                            ? "bg-[color:var(--accent-amber)]"
                            : "bg-[color:var(--accent-rose)]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm text-[color:var(--muted-foreground)]">
            No questions have been featured yet. Select questions above and click &quot;Feature&quot;.
          </p>
        )}
      </Surface>

      {/* ── SUPERADMIN: Credit reset ────────────────── */}
      {isSuperadmin && (
        <Surface glow="rose" className="p-6 admin-enter">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/10 text-[color:var(--accent-rose)]">
                <RotateCcw className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Reset all free exam credits</p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  Sets every free user&apos;s credits back to 4 and clears their subject history. This is irreversible.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusBadge tone={isStepUpActive ? "emerald" : "amber"}>
                {isStepUpActive ? "Step-up active" : "Step-up required"}
              </StatusBadge>
              <button
                type="button"
                onClick={() => resetMutation.mutate()}
                disabled={!isStepUpActive || resetMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--accent-rose)]/25 bg-[color:var(--accent-rose)]/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[color:var(--accent-rose)]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {resetMutation.isPending ? "Resetting..." : "Reset credits"}
              </button>
            </div>
          </div>
          {!isStepUpActive && (
            <Link
              href="/step-up?next=/questions/free-exam&intent=Free%20exam%20credit%20reset"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90"
            >
              Complete step-up verification
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </Surface>
      )}
    </section>
  );
}
