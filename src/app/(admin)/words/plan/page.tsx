"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useRefreshWords, useWordCards, useWordPlan } from "@/features/words/hooks/use-words";
import { KIND_LABEL, addDays, formatDay, planRows, type PlanRow } from "@/features/words/lib/word-rules";
import { adminWordsApi, type PlanDay, type WordKind } from "@/lib/api/admin-words";
import { cn } from "@/lib/utils/cn";
import { useMutation } from "@tanstack/react-query";
import { Pin, RefreshCw, Shuffle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Word of the day: the plan.
 *
 * A week back to two weeks ahead, one row per day. Today and the past are
 * fixed, because students may have seen them. Days ahead are planned again
 * every night from the READY cards, except days the team pinned. Swapping a
 * day pins it, so the swap stays.
 */

function useOptions(kind: WordKind) {
  const query = useWordCards({ kind, status: "READY", limit: 100 });
  return (query.data?.cards ?? []).map((card) => ({
    value: String(card.id),
    label: card.headword,
    hint: card.plannedFor[0] ? formatDay(card.plannedFor[0]) : card.shownOn.length ? `shown ${card.shownOn.length}×` : undefined,
  }));
}

function DayCell({
  row,
  kind,
  day,
  options,
}: {
  row: PlanRow;
  kind: WordKind;
  day: PlanDay | null;
  options: { value: string; label: string; hint?: string }[];
}) {
  const refresh = useRefreshWords();
  const [picking, setPicking] = useState(false);
  const isFuture = !row.isPast && !row.isToday;
  const label = KIND_LABEL[kind].toLowerCase();

  const onError = (title: string) => (error: unknown) =>
    toast.error(title, { description: <ApiErrorMessage error={error} fallback="Please try again." /> });

  const swap = useMutation({
    mutationFn: () => adminWordsApi.swap(row.date, kind),
    onSuccess: async (plan) => {
      const next = plan.days.find((entry) => entry.date === row.date && entry.kind === kind);
      toast.success(next ? `${formatDay(row.date)} now has "${next.headword}"` : `No other ready ${label} to put on ${formatDay(row.date)}`);
      await refresh();
    },
    onError: onError("Could not swap the card"),
  });

  const pin = useMutation({
    mutationFn: (cardId: number) => adminWordsApi.pin(row.date, kind, cardId),
    onSuccess: async () => {
      toast.success(`Pinned to ${formatDay(row.date)}`);
      setPicking(false);
      await refresh();
    },
    onError: onError("Could not pin the card"),
  });

  return (
    <div className="min-w-0 space-y-1.5">
      <span className="text-[length:var(--sb-text-2xs)] font-medium uppercase tracking-wide text-[var(--sb-text-tertiary)] sm:hidden">
        {KIND_LABEL[kind]}
      </span>
      {day ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/words?card=${day.cardId}`}
            className={cn(
              "truncate font-medium hover:underline",
              row.isPast ? "text-[var(--sb-text-secondary)]" : "text-[var(--sb-text)]",
            )}
          >
            {day.headword}
          </Link>
          {day.pinned && isFuture ? (
            <Badge>
              <Pin className="inline h-3 w-3" /> Pinned
            </Badge>
          ) : null}
          {day.status === "DRAFT" ? <Badge tone="danger">Draft</Badge> : null}
        </div>
      ) : (
        <span className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
          {row.isPast || row.isToday ? `No ${label}` : "Not planned yet"}
        </span>
      )}

      {isFuture ? (
        picking ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48 max-w-full">
              <CustomSelect
                aria-label={`Card to pin to ${formatDay(row.date)}`}
                size="sm"
                value=""
                placeholder={options.length ? `Pick a ready ${label}` : `No ready ${label}s`}
                disabled={!options.length || pin.isPending}
                options={options}
                onValueChange={(value) => pin.mutate(Number(value))}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(false)} disabled={pin.isPending}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="-ml-3 flex flex-wrap gap-1">
            {day ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => swap.mutate()} isLoading={swap.isPending}>
                <Shuffle className="h-3.5 w-3.5" />
                Swap
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(true)}>
              <Pin className="h-3.5 w-3.5" />
              {day ? "Choose" : "Pin a card"}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

export default function WordPlanPage() {
  const planQuery = useWordPlan();
  const refresh = useRefreshWords();
  const wordOptions = useOptions("WORD");
  const idiomOptions = useOptions("IDIOM");
  const phrasalOptions = useOptions("PHRASAL_VERB");

  const planNow = useMutation({
    mutationFn: () => adminWordsApi.planNow(),
    onSuccess: async () => {
      toast.success("Planned again");
      await refresh();
    },
    onError: (error) => toast.error("Could not plan", { description: <ApiErrorMessage error={error} fallback="Please try again." /> }),
  });

  const plan = planQuery.data;
  /* A week back, but no empty rows from before the first card was ever shown. */
  const weekBack = plan ? addDays(plan.today, -7) : "";
  const firstDay = plan?.days[0]?.date ?? plan?.today ?? "";
  const from = plan ? (firstDay < weekBack ? weekBack : firstDay < plan.today ? firstDay : plan.today) : "";
  const rows = plan ? planRows(plan, from, addDays(plan.today, 13)) : [];
  /* Missing on a backend from before the phrasal verb card (2026-11-20). */
  const phrasalCycle = plan?.cycles.PHRASAL_VERB ?? { cycle: 1, ready: 0, leftInCycle: 0 };
  const nothingReady = plan ? plan.cycles.WORD.ready + plan.cycles.IDIOM.ready + phrasalCycle.ready === 0 : false;

  return (
    <div className="sb-enter space-y-5 pb-2">
      <PageHeader
        title="Plan"
        description="What students see each day. Today and past days never change. Days ahead are planned again every night just after midnight, Lagos time, except pinned days."
        action={
          <Button type="button" variant="secondary" onClick={() => planNow.mutate()} isLoading={planNow.isPending}>
            <RefreshCw className="h-4 w-4" />
            Plan now
          </Button>
        }
      />

      {planQuery.isError ? (
        <ErrorState title="Could not load the plan" error={planQuery.error} onRetry={() => planQuery.refetch()} />
      ) : null}

      {plan ? (
        <StatGrid className="lg:grid-cols-3">
          <StatCard label="Ready words" value={String(plan.cycles.WORD.ready)} hint={`Round ${plan.cycles.WORD.cycle}`} />
          <StatCard label="Ready idioms" value={String(plan.cycles.IDIOM.ready)} hint={`Round ${plan.cycles.IDIOM.cycle}`} />
          <StatCard label="Ready phrasal verbs" value={String(phrasalCycle.ready)} hint={`Round ${phrasalCycle.cycle}`} />
          <StatCard
            label="Words left this round"
            value={String(plan.cycles.WORD.leftInCycle)}
            hint="Then the round starts again"
            status={plan.cycles.WORD.ready > 0 && plan.cycles.WORD.leftInCycle <= 7 ? "warning" : undefined}
          />
          <StatCard
            label="Idioms left this round"
            value={String(plan.cycles.IDIOM.leftInCycle)}
            hint="Then the round starts again"
            status={plan.cycles.IDIOM.ready > 0 && plan.cycles.IDIOM.leftInCycle <= 7 ? "warning" : undefined}
          />
          {/* Phrasal verbs are fewer and may come round again sooner, so no warning here. */}
          <StatCard label="Phrasal verbs left this round" value={String(phrasalCycle.leftInCycle)} hint="Then the round starts again" />
        </StatGrid>
      ) : planQuery.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : null}

      {nothingReady ? (
        <p className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          No card is ready yet, so nothing is planned. Set cards ready on the{" "}
          <Link href="/words" className="text-[var(--sb-accent-text)] hover:underline">
            cards page
          </Link>
          .
        </p>
      ) : null}

      {plan ? (
        <div className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
          <div className="hidden grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-[var(--sb-border)] px-4 py-2.5 text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)] sm:grid">
            <span>Day</span>
            <span>Word</span>
            <span>Idiom</span>
            <span>Phrasal verb</span>
          </div>
          <ul className="divide-y divide-[var(--sb-border)]">
            {rows.map((row) => (
              <li
                key={row.date}
                className={cn(
                  "grid gap-3 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4",
                  row.isToday && "bg-[var(--sb-accent-soft)]",
                  row.isPast && "opacity-70",
                )}
              >
                <div className="flex items-center gap-2 sm:block">
                  <span className="sb-nums block text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">{formatDay(row.date)}</span>
                  {row.isToday ? <Badge tone="brand">Today</Badge> : null}
                </div>
                <DayCell row={row} kind="WORD" day={row.word} options={wordOptions} />
                <DayCell row={row} kind="IDIOM" day={row.idiom} options={idiomOptions} />
                <DayCell row={row} kind="PHRASAL_VERB" day={row.phrasalVerb} options={phrasalOptions} />
              </li>
            ))}
          </ul>
        </div>
      ) : planQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : null}

      {plan ? (
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          Today&apos;s card can&apos;t be swapped here, because students may have seen it. To pull a wrong card, set it back to draft on
          the cards page: another ready card takes its place straight away.
        </p>
      ) : null}
    </div>
  );
}
