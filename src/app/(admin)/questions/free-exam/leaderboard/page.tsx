"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  Clock,
  Crown,
  Medal,
  Trophy,
} from "lucide-react";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { CustomSelect } from "@/components/ui/custom-select";

import { useFreeExamLeaderboard } from "@/features/questions/hooks/use-free-exam-leaderboard";
import { formatInteger, formatDateTime, formatDurationSeconds } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/* ─── Helpers ───────────────────────────────────────── */

function medalColor(rank: number) {
  if (rank === 1) return { bg: "from-[#FFD700]/20 to-[#B8860B]/5", border: "border-[#FFD700]/30", text: "text-[#FFD700]", glow: "shadow-[0_0_20px_rgba(255,215,0,0.15)]" };
  if (rank === 2) return { bg: "from-[#C0C0C0]/15 to-[#808080]/5", border: "border-[#C0C0C0]/25", text: "text-[#C0C0C0]", glow: "shadow-[0_0_20px_rgba(192,192,192,0.12)]" };
  if (rank === 3) return { bg: "from-[#CD7F32]/15 to-[#8B4513]/5", border: "border-[#CD7F32]/25", text: "text-[#CD7F32]", glow: "shadow-[0_0_20px_rgba(205,127,50,0.12)]" };
  return { bg: "from-white/[0.02] to-white/[0.01]", border: "border-white/8", text: "text-[color:var(--muted-foreground)]", glow: "" };
}

function podiumHeight(rank: number) {
  if (rank === 1) return "min-h-[220px]";
  if (rank === 2) return "min-h-[185px]";
  return "min-h-[160px]";
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-6 w-6" />;
  if (rank === 2) return <Medal className="h-5 w-5" />;
  if (rank === 3) return <Award className="h-5 w-5" />;
  return null;
}

function percentageTone(pct: number): "emerald" | "amber" | "rose" | "cyan" {
  if (pct >= 80) return "emerald";
  if (pct >= 60) return "cyan";
  if (pct >= 40) return "amber";
  return "rose";
}

function daysBetween(start: string, end: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
}

/* ─── Page ──────────────────────────────────────────── */

export default function FreeExamLeaderboardPage() {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  const { data, isLoading, isError, error } = useFreeExamLeaderboard(cycleIndex);

  const cycles = data?.cycles ?? [];
  const subjects = data?.subjects ?? [];
  const activeSubject = subjects[activeSubjectIndex] ?? null;

  // ── Derived metrics
  const totalParticipants = useMemo(() => {
    const userIds = new Set<number>();
    for (const s of subjects) {
      for (const scorer of s.scorers) {
        userIds.add(scorer.userId);
      }
    }
    return userIds.size;
  }, [subjects]);

  const subjectsActive = subjects.length;

  const highestScore = useMemo(() => {
    let best = 0;
    for (const s of subjects) {
      for (const scorer of s.scorers) {
        if (scorer.percentage > best) best = scorer.percentage;
      }
    }
    return best;
  }, [subjects]);

  const cycleDays = data ? daysBetween(data.cycleStart, data.cycleEnd) : 0;

  // Cycle selector options
  const cycleOptions = useMemo(() =>
    cycles.map((c: any) => ({
      value: String(c.index),
      label: c.label,
    })),
    [cycles]
  );

  // Reset subject tab when cycle changes
  const handleCycleChange = (val: string) => {
    setCycleIndex(parseInt(val, 10));
    setActiveSubjectIndex(0);
  };

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Free exams"
        title="Top Scorers Leaderboard"
        description="Ranked performance for free exam users across each subject per reset cycle. First-attempt scores only."
        action={
          <Link
            href="/questions/free-exam"
            className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
            Free Exam Pool
          </Link>
        }
      />

      {/* ── Cycle selector ────────────────────────────── */}
      {cycleOptions.length > 0 && (
        <Surface className="admin-enter flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--accent-amber)]/20 bg-[color:var(--accent-amber)]/10 text-[color:var(--accent-amber)]">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Reset cycle</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {data?.cycleEnd
                  ? `${formatDateTime(data.cycleStart)} → ${formatDateTime(data.cycleEnd)}`
                  : `Since ${formatDateTime(data?.cycleStart)}`}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <CustomSelect
              value={String(cycleIndex)}
              onValueChange={handleCycleChange}
              options={cycleOptions}
              placeholder="Select cycle..."
            />
          </div>
        </Surface>
      )}

      {/* ── Metrics ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Participants"
          value={isLoading ? "—" : formatInteger(totalParticipants)}
          delta="Unique free exam users"
          tone="cyan"
          className="admin-enter"
          style={{ animationDelay: "0ms" }}
        />
        <MetricCard
          label="Subjects active"
          value={isLoading ? "—" : formatInteger(subjectsActive)}
          delta="With at least one scorer"
          tone="emerald"
          className="admin-enter"
          style={{ animationDelay: "80ms" }}
        />
        <MetricCard
          label="Top score"
          value={isLoading ? "—" : `${highestScore}%`}
          delta="Highest percentage this cycle"
          tone="amber"
          className="admin-enter"
          style={{ animationDelay: "160ms" }}
        />
        <MetricCard
          label="Cycle duration"
          value={isLoading ? "—" : `${cycleDays}d`}
          delta={cycleDays === 0 ? "Less than a day" : `${cycleDays} day${cycleDays !== 1 ? "s" : ""} elapsed`}
          tone="rose"
          className="admin-enter"
          style={{ animationDelay: "240ms" }}
        />
      </div>

      {/* ── Error state ──────────────────────────────── */}
      {isError && (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load leaderboard.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage error={error} fallback="Please try again." />
          </p>
        </Surface>
      )}

      {/* ── Loading state ────────────────────────────── */}
      {isLoading && (
        <Surface className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        </Surface>
      )}

      {/* ── Empty state ──────────────────────────────── */}
      {!isLoading && !isError && subjects.length === 0 && (
        <Surface className="px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
            <Trophy className="h-7 w-7 text-[color:var(--muted-foreground)]" />
          </div>
          <p className="mt-5 text-lg font-semibold text-white">No exam data for this cycle</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Free users haven&apos;t completed any exams in this reset cycle yet.
          </p>
        </Surface>
      )}

      {/* ── Subject tabs + Leaderboard ──────────────── */}
      {!isLoading && !isError && subjects.length > 0 && (
        <>
          {/* Subject tab bar */}
          <div className="admin-enter flex gap-2 overflow-x-auto pb-1 scrollbar-thin" style={{ animationDelay: "300ms" }}>
            {subjects.map((s, idx) => (
              <button
                key={s.subject}
                type="button"
                onClick={() => setActiveSubjectIndex(idx)}
                className={cn(
                  "shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                  idx === activeSubjectIndex
                    ? "border-[color:var(--accent-amber)]/30 bg-[color:var(--accent-amber)]/10 text-[#f2e0c4] shadow-[0_0_12px_rgba(196,148,74,0.1)]"
                    : "border-white/8 bg-white/[0.02] text-[color:var(--muted-foreground)] hover:border-white/14 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  {s.subject}
                  <StatusBadge tone={idx === activeSubjectIndex ? "amber" : "slate"}>
                    {s.scorers.length}
                  </StatusBadge>
                </span>
              </button>
            ))}
          </div>

          {/* Podium — Top 3 */}
          {activeSubject && activeSubject.scorers.length > 0 && (
            <div className="admin-enter grid gap-4 md:grid-cols-3" style={{ animationDelay: "380ms" }}>
              {/* Reorder for podium display: 2nd, 1st, 3rd */}
              {[1, 0, 2].map((podiumIdx: any) => {
                const scorer = activeSubject.scorers[podiumIdx];
                if (!scorer) return <div key={podiumIdx} />;

                const colors = medalColor(scorer.rank);
                return (
                  <Surface
                    key={scorer.userId}
                    className={cn(
                      "relative overflow-hidden p-5 transition-all duration-500",
                      colors.glow,
                      podiumHeight(scorer.rank),
                      scorer.rank === 1 && "md:order-2 md:-mt-2",
                      scorer.rank === 2 && "md:order-1 md:mt-4",
                      scorer.rank === 3 && "md:order-3 md:mt-6"
                    )}
                  >
                    {/* Gradient overlay */}
                    <div className={cn(
                      "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b opacity-50",
                      colors.bg
                    )} />

                    <div className="relative flex h-full flex-col items-center justify-center text-center">
                      {/* Medal icon */}
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2",
                        colors.border, colors.text
                      )}>
                        {rankIcon(scorer.rank)}
                      </div>

                      {/* Rank */}
                      <p className={cn("mt-3 text-3xl font-bold tracking-tight", colors.text)}>
                        #{scorer.rank}
                      </p>

                      {/* Name */}
                      <p className="mt-2 text-sm font-semibold text-white truncate max-w-full">
                        {scorer.fullName}
                      </p>
                      <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)] truncate max-w-full">
                        {scorer.email}
                      </p>

                      {/* Score */}
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">{scorer.score}</span>
                        <span className="text-sm text-[color:var(--muted-foreground)]">/ {scorer.totalQuestions}</span>
                      </div>

                      {/* Percentage + time */}
                      <div className="mt-2 flex items-center gap-3">
                        <StatusBadge tone={percentageTone(scorer.percentage)}>
                          {scorer.percentage}%
                        </StatusBadge>
                        <span className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                          <Clock className="h-3 w-3" />
                          {formatDurationSeconds(scorer.timeTakenSeconds)}
                        </span>
                      </div>

                      {/* Action link */}
                      <Link
                        href={`/users?search=${encodeURIComponent(scorer.email)}`}
                        className="mt-3 text-xs font-medium text-[color:var(--accent-cyan)] transition hover:text-white"
                      >
                        View profile →
                      </Link>
                    </div>
                  </Surface>
                );
              })}
            </div>
          )}

          {/* Full table */}
          {activeSubject && activeSubject.scorers.length > 0 && (
            <Surface className="admin-enter overflow-hidden p-0" style={{ animationDelay: "460ms" }}>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[900px] w-full divide-y divide-white/8 text-sm">
                  <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                    <tr>
                      <th className="w-16 px-5 py-3.5 text-center">Rank</th>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5 text-center">Score</th>
                      <th className="px-5 py-3.5 text-center">Percentage</th>
                      <th className="px-5 py-3.5 text-center">Time</th>
                      <th className="px-5 py-3.5">Completed</th>
                      <th className="px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 bg-black/10">
                    {activeSubject.scorers.map((scorer: any) => {
                      const colors = medalColor(scorer.rank);
                      return (
                        <tr
                          key={scorer.userId}
                          className={cn(
                            "group/row transition",
                            scorer.rank <= 3
                              ? "bg-gradient-to-r " + colors.bg
                              : "hover:bg-white/[0.03]"
                          )}
                        >
                          <td className="px-5 py-3.5 text-center">
                            <span className={cn("inline-flex items-center gap-1.5 font-semibold", colors.text)}>
                              {rankIcon(scorer.rank)}
                              {scorer.rank}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-white">{scorer.fullName}</p>
                            <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{scorer.email}</p>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="font-semibold text-white">{scorer.score}</span>
                            <span className="text-[color:var(--muted-foreground)]"> / {scorer.totalQuestions}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <StatusBadge tone={percentageTone(scorer.percentage)}>
                              {scorer.percentage}%
                            </StatusBadge>
                          </td>
                          <td className="px-5 py-3.5 text-center text-[color:var(--muted-foreground)]">
                            <span className="flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDurationSeconds(scorer.timeTakenSeconds)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[color:var(--muted-foreground)]">
                            {formatDateTime(scorer.completedAt)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Link
                              href={`/users?search=${encodeURIComponent(scorer.email)}`}
                              className="text-xs font-medium text-[color:var(--accent-cyan)] transition hover:text-white"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 p-3 md:hidden">
                {activeSubject.scorers.map((scorer: any) => {
                  const colors = medalColor(scorer.rank);
                  return (
                    <div
                      key={scorer.userId}
                      className={cn(
                        "rounded-2xl border p-4 transition",
                        scorer.rank <= 3
                          ? cn(colors.border, "bg-gradient-to-br", colors.bg)
                          : "border-white/[0.06] bg-white/[0.02]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border font-bold",
                            colors.border, colors.text
                          )}>
                            {scorer.rank <= 3 ? rankIcon(scorer.rank) : `#${scorer.rank}`}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{scorer.fullName}</p>
                            <p className="text-xs text-[color:var(--muted-foreground)] truncate">{scorer.email}</p>
                          </div>
                        </div>
                        <StatusBadge tone={percentageTone(scorer.percentage)}>
                          {scorer.percentage}%
                        </StatusBadge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--muted-foreground)]">
                        <span className="font-medium text-white">
                          {scorer.score}/{scorer.totalQuestions} correct
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDurationSeconds(scorer.timeTakenSeconds)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {formatDateTime(scorer.completedAt)}
                        </span>
                        <Link
                          href={`/users?search=${encodeURIComponent(scorer.email)}`}
                          className="text-xs font-medium text-[color:var(--accent-cyan)] transition hover:text-white"
                        >
                          View profile →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Surface>
          )}
        </>
      )}
    </section>
  );
}
