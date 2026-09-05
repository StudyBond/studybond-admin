"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FieldShell } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { FilterChips } from "@/components/ui/toolbar";
import { useFreeExamLeaderboard } from "@/features/questions/hooks/use-free-exam-leaderboard";
import { cn } from "@/lib/utils/cn";
import {
  formatDate,
  formatDateTime,
  formatDurationSeconds,
  formatInteger,
} from "@/lib/utils/format";
import { ArrowLeft, Award, Crown, Medal, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Free exam leaderboard.
 *
 * The broken thing: every "View profile" link pointed at
 * `/users?search=<email>`, but the users page keeps its search in component
 * state and never reads the query string — so all of these landed on an
 * unfiltered user list, leaving you to search by hand for the person you
 * had just clicked. Each scorer already carries `userId`, so they now link
 * straight to that user.
 *
 * The rest is restraint. The podium had three different `min-h` values,
 * three gradient overlays, three coloured glow shadows, and every block on
 * the page carried its own `animationDelay` between 0ms and 460ms, so the
 * screen assembled itself in six stages. Gold, silver and bronze survive —
 * they are a real convention and they mean rank — but the glows and the
 * staggered entrance are gone.
 *
 * Score percentage was painted on a four-colour scale ending in rose, so a
 * learner scoring 35% was flagged in the colour this system uses for
 * something being broken. A low score is not an error. Only a strong score
 * is marked now.
 */

/* Rank colours. Gold is the existing premium token; the other two are the
   conventional medal colours and appear nowhere else. */
const MEDALS: Record<number, { color: string; ring: string; label: string }> = {
  1: { color: "var(--sb-gold)", ring: "rgba(212,161,33,0.35)", label: "1st" },
  2: { color: "#c0c0c0", ring: "rgba(192,192,192,0.30)", label: "2nd" },
  3: { color: "#cd7f32", ring: "rgba(205,127,50,0.30)", label: "3rd" },
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5" />;
  if (rank === 2) return <Medal className="h-5 w-5" />;
  if (rank === 3) return <Award className="h-5 w-5" />;
  return null;
}

function daysBetween(start: string, end: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  return Math.max(
    0,
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000),
  );
}

export default function FreeExamLeaderboardPage() {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [activeSubject, setActiveSubject] = useState("");

  const { data, isLoading, isError, error, refetch } =
    useFreeExamLeaderboard(cycleIndex);

  const cycles = useMemo(() => data?.cycles ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);

  /* Falls back to the first subject, so a cycle change cannot leave the
     page pointing at a subject this cycle does not have. */
  const currentSubject =
    subjects.find((subject) => subject.subject === activeSubject) ??
    subjects[0] ??
    null;

  const totalParticipants = useMemo(() => {
    const userIds = new Set<number>();
    for (const subject of subjects) {
      for (const scorer of subject.scorers) userIds.add(scorer.userId);
    }
    return userIds.size;
  }, [subjects]);

  const highestScore = useMemo(() => {
    let best = 0;
    for (const subject of subjects) {
      for (const scorer of subject.scorers) {
        if (scorer.percentage > best) best = scorer.percentage;
      }
    }
    return best;
  }, [subjects]);

  const cycleDays = data ? daysBetween(data.cycleStart, data.cycleEnd) : 0;

  const cycleOptions = useMemo(
    () =>
      cycles.map((cycle) => ({
        value: String(cycle.index),
        label: cycle.label,
      })),
    [cycles],
  );

  const subjectOptions = useMemo(
    () =>
      subjects.map((subject) => ({
        label: `${subject.subject} (${subject.scorers.length})`,
        value: subject.subject,
      })),
    [subjects],
  );

  type Scorer = NonNullable<typeof currentSubject>["scorers"][number];

  const columns: Column<Scorer>[] = [
    {
      key: "rank",
      header: "Rank",
      primary: true,
      width: "6rem",
      cell: (scorer) => {
        const medal = MEDALS[scorer.rank];
        return (
          <span
            className="sb-nums inline-flex items-center gap-1.5 font-semibold"
            style={medal ? { color: medal.color } : undefined}
          >
            <RankIcon rank={scorer.rank} />#{scorer.rank}
          </span>
        );
      },
    },
    {
      key: "student",
      header: "Student",
      cell: (scorer) => (
        <div className="min-w-0">
          <p className="truncate text-[var(--sb-text)]">{scorer.fullName}</p>
          <p className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {scorer.email}
          </p>
        </div>
      ),
    },
    {
      key: "score",
      header: "Score",
      numeric: true,
      width: "7rem",
      cell: (scorer) => (
        <span>
          {scorer.score}
          <span className="text-[var(--sb-text-tertiary)]">
            /{scorer.totalQuestions}
          </span>
        </span>
      ),
    },
    {
      key: "percentage",
      header: "Percentage",
      width: "7.5rem",
      /* Only a strong result is marked. A weak one is a fact, not a fault. */
      cell: (scorer) =>
        scorer.percentage >= 80 ? (
          <Badge tone="success">{scorer.percentage}%</Badge>
        ) : (
          <span className="sb-nums">{scorer.percentage}%</span>
        ),
    },
    {
      key: "time",
      header: "Time taken",
      numeric: true,
      width: "8rem",
      showFrom: "lg",
      cell: (scorer) => formatDurationSeconds(scorer.timeTakenSeconds),
    },
    {
      key: "completed",
      header: "Completed",
      width: "10rem",
      showFrom: "xl",
      cell: (scorer) => formatDate(scorer.completedAt),
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Free exam leaderboard"
        description="Best first attempt per learner, per subject, within one reset cycle."
        meta={
          data ? (
            <Badge tone="neutral">
              {data.cycleEnd
                ? `${formatDate(data.cycleStart)} → ${formatDate(data.cycleEnd)}`
                : `Open since ${formatDate(data.cycleStart)}`}
            </Badge>
          ) : null
        }
        action={
          <Button asChild href="/questions/free-exam" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Free exam pool
          </Button>
        }
      />

      {cycleOptions.length > 0 ? (
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-3 sm:p-4">
          <div className="max-w-sm">
            <FieldShell label="Reset cycle">
              <CustomSelect
                aria-label="Choose a reset cycle"
                value={String(cycleIndex)}
                onValueChange={(value) => {
                  setCycleIndex(Number.parseInt(value, 10));
                  setActiveSubject("");
                }}
                options={cycleOptions}
                placeholder="Choose a cycle"
              />
            </FieldShell>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard
            label="Participants"
            value={formatInteger(totalParticipants)}
            hint="Distinct learners this cycle"
          />
          <StatCard
            label="Subjects with entries"
            value={formatInteger(subjects.length)}
            hint="At least one completed exam"
          />
          <StatCard
            label="Top score"
            value={`${highestScore}%`}
            hint="Best result across all subjects"
          />
          <StatCard
            label="Cycle length"
            value={cycleDays === 0 ? "Today" : `${cycleDays} days`}
            hint={data?.cycleEnd ? "Closed cycle" : "Still running"}
          />
        </StatGrid>
      )}

      {isError ? (
        <ErrorState
          title="Could not load the leaderboard"
          error={error}
          onRetry={() => refetch()}
        />
      ) : null}

      {!isLoading && !isError && subjects.length === 0 ? (
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
          <EmptyState
            icon={<Trophy className="h-4 w-4" />}
            title="Nothing scored in this cycle"
            description="No free learner has finished an exam yet. Pick an earlier cycle, or check the free exam pool has questions in it."
            action={
              <Button
                asChild
                href="/questions/free-exam"
                variant="secondary"
                size="sm"
              >
                Open the free exam pool
              </Button>
            }
          />
        </div>
      ) : null}

      {!isLoading && !isError && currentSubject ? (
        <>
          <FieldShell label="Subject">
            <FilterChips
              options={subjectOptions}
              value={currentSubject.subject}
              onChange={setActiveSubject}
            />
          </FieldShell>

          {/* ── Podium ────────────────────────────────────────
              Ordered 2 · 1 · 3 with the winner raised. The heights,
              gradient overlays and coloured glow shadows are gone; the
              medal colour and the raised centre carry the meaning. */}
          {currentSubject.scorers.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {[1, 0, 2].map((index) => {
                const scorer = currentSubject.scorers[index];
                if (!scorer) return <div key={index} aria-hidden="true" />;

                const medal = MEDALS[scorer.rank];
                return (
                  <div
                    key={scorer.userId}
                    className={cn(
                      "flex flex-col items-center rounded-[var(--sb-radius-lg)] border bg-[var(--sb-surface-1)] p-5 text-center",
                      scorer.rank === 1 && "md:order-2 md:-mt-3",
                      scorer.rank === 2 && "md:order-1",
                      scorer.rank === 3 && "md:order-3 md:mt-3",
                    )}
                    style={{
                      borderColor: medal
                        ? medal.ring
                        : "var(--sb-border)",
                    }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: medal?.ring,
                        color: medal?.color,
                      }}
                    >
                      <RankIcon rank={scorer.rank} />
                    </div>

                    <p
                      className="sb-nums mt-2.5 text-[length:var(--sb-text-2xl)] font-semibold leading-none"
                      style={{ color: medal?.color }}
                    >
                      #{scorer.rank}
                    </p>

                    <p className="mt-2 max-w-full truncate text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                      {scorer.fullName}
                    </p>
                    <p className="max-w-full truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      {scorer.email}
                    </p>

                    <p className="sb-nums mt-3 text-[length:var(--sb-text-xl)] font-semibold text-[var(--sb-text)]">
                      {scorer.score}
                      <span className="text-[length:var(--sb-text-base)] text-[var(--sb-text-tertiary)]">
                        /{scorer.totalQuestions}
                      </span>
                    </p>

                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                      <Badge tone="neutral">{scorer.percentage}%</Badge>
                      <span className="sb-nums text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {formatDurationSeconds(scorer.timeTakenSeconds)}
                      </span>
                    </div>

                    {/* Straight to the user, rather than a search page that
                        never read the query string. */}
                    <Button
                      asChild
                      href={`/users/${scorer.userId}`}
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                    >
                      Open profile
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <section className="space-y-3">
            <SectionTitle
              title={`Every score in ${currentSubject.subject}`}
              description={`${formatInteger(
                currentSubject.scorers.length,
              )} learner${
                currentSubject.scorers.length === 1 ? "" : "s"
              }, ranked. Completed ${
                data ? formatDateTime(data.cycleStart) : ""
              } onwards.`}
            />
            <DataTable
              caption={`Free exam scores for ${currentSubject.subject}`}
              items={currentSubject.scorers}
              columns={columns}
              getKey={(scorer) => scorer.userId}
              href={(scorer) => `/users/${scorer.userId}`}
              emptyIcon={<Trophy className="h-4 w-4" />}
              emptyTitle="No scores in this subject"
              emptyDescription="Nobody has completed a free exam in this subject yet."
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
