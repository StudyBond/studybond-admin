"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SearchField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChips, Pagination } from "@/components/ui/toolbar";
import { WordCardPanel } from "@/features/words/components/word-card-panel";
import { useRefreshWords, useWordCard, useWordCards } from "@/features/words/hooks/use-words";
import { KIND_LABEL, cameOutLine, canGoReady, cardState, formatDay } from "@/features/words/lib/word-rules";
import { adminWordsApi, type WordCard, type WordKind } from "@/lib/api/admin-words";
import { cn } from "@/lib/utils/cn";
import { formatInteger } from "@/lib/utils/format";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { BookType, CalendarDays, Plus, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Word of the day: the cards.
 *
 * Every word and idiom card, with what still blocks it from going READY.
 * Cards come in from the content pipeline on the Upload page as drafts.
 * Once a card is READY the planner can give it a day; the Plan page shows
 * which day.
 */

type KindFilter = "all" | WordKind;
type StatusFilter = "all" | "READY" | "DRAFT" | "fix";

const PAGE_SIZE = 100;

export default function WordsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <WordsContent />
    </Suspense>
  );
}

function WordsContent() {
  const linked = Number.parseInt(useSearchParams().get("card") ?? "", 10);
  const [kind, setKind] = useState<KindFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(Number.isFinite(linked) ? linked : null);
  const [newKind, setNewKind] = useState<WordKind | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const dirty = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const refresh = useRefreshWords();
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const listQuery = useWordCards({
    kind: kind === "all" ? undefined : kind,
    status: status === "all" ? undefined : status === "fix" ? "DRAFT" : status,
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const cards = listQuery.data?.cards ?? [];
  const visible = status === "fix" ? cards.filter((card) => card.readyProblems.length > 0) : cards;
  const counts = listQuery.data?.counts;

  /* A card opened from a link may not be in the current list. */
  const inList = cards.find((card) => card.id === selectedId);
  const linkedQuery = useWordCard(selectedId !== null && !inList && !listQuery.isLoading ? selectedId : null);
  const selected: WordCard | undefined = newKind ? undefined : (inList ?? linkedQuery.data ?? visible[0]);

  const readyable = cards.filter(canGoReady);

  const onDirtyChange = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  function leaveOk() {
    return !dirty.current || window.confirm("You have changes that are not saved. Leave them?");
  }

  function open(card: WordCard) {
    if (card.id === selected?.id && !newKind) return;
    if (!leaveOk()) return;
    setNewKind(null);
    setSelectedId(card.id);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function startNew(next: WordKind) {
    if (!leaveOk()) return;
    setNewKind(next);
  }

  /* One call per card, so each one is checked on its own and a failure stops nothing else. */
  async function setAllReady() {
    const batch = [...readyable];
    setBulk({ done: 0, total: batch.length });
    const failed: string[] = [];
    for (const [index, card] of batch.entries()) {
      try {
        await adminWordsApi.setStatus(card.id, "READY");
      } catch {
        failed.push(card.headword);
      }
      setBulk({ done: index + 1, total: batch.length });
    }
    setBulk(null);
    await refresh();
    if (failed.length) {
      toast.error(`${batch.length - failed.length} set ready, ${failed.length} could not be`, {
        description: failed.join(", "),
      });
    } else {
      toast.success(`${batch.length} ${batch.length === 1 ? "card is" : "cards are"} ready`);
    }
  }

  const phrasalReady = counts?.readyPhrasalVerbs ?? 0;
  const phrasalTotal = phrasalReady + (counts?.draftPhrasalVerbs ?? 0);
  const totalReady = (counts?.readyWords ?? 0) + (counts?.readyIdioms ?? 0) + phrasalReady;
  const totalDraft = (counts?.draftWords ?? 0) + (counts?.draftIdioms ?? 0) + (counts?.draftPhrasalVerbs ?? 0);
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="sb-enter space-y-5 pb-2">
      <PageHeader
        title="Word of the day"
        description={
          counts && totalReady + totalDraft === 0
            ? "No cards yet. Upload the cards file from the content pipeline to start."
            : counts
            ? `${formatInteger(counts.readyWords)} words, ${formatInteger(counts.readyIdioms)} idioms and ${formatInteger(phrasalReady)} phrasal verbs are ready. ${formatInteger(totalDraft)} ${totalDraft === 1 ? "card is" : "cards are"} still drafts. Students only ever see ready cards.`
            : "Word, idiom and phrasal verb cards, from the real JAMB questions they came out in."
        }
        meta={
          counts && totalReady + totalDraft > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <Badge>{formatInteger(counts.readyWords + counts.draftWords)} words</Badge>
              <Badge>{formatInteger(counts.readyIdioms + counts.draftIdioms)} idioms</Badge>
              <Badge>{formatInteger(phrasalTotal)} phrasal verbs</Badge>
            </div>
          ) : null
        }
        action={
          <>
            <Button asChild variant="secondary" href="/words/plan">
              <CalendarDays className="h-4 w-4" />
              Plan
            </Button>
            <Button asChild variant="secondary" href="/words/upload">
              <Upload className="h-4 w-4" />
              Upload cards
            </Button>
          </>
        }
      />

      {listQuery.isError ? (
        <ErrorState title="Could not load the cards" error={listQuery.error} onRetry={() => listQuery.refetch()} />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <section aria-label="Cards" className="min-w-0 space-y-3">
          <SearchField
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Find a word, idiom or phrasal verb"
            aria-label="Find a word, idiom or phrasal verb"
          />
          <FilterChips
            options={[
              { value: "all", label: "All cards" },
              { value: "WORD", label: "Words" },
              { value: "IDIOM", label: "Idioms" },
              { value: "PHRASAL_VERB", label: "Phrasal verbs" },
            ]}
            value={kind}
            onChange={(value) => {
              setKind(value as KindFilter);
              setPage(1);
            }}
          />
          <FilterChips
            options={[
              { value: "all", label: "Any status" },
              { value: "READY", label: "Ready" },
              { value: "DRAFT", label: "Draft" },
              { value: "fix", label: "Something to fix" },
            ]}
            value={status}
            onChange={(value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
          />

          {readyable.length > 0 ? (
            <div className="space-y-2 rounded-[var(--sb-radius-lg)] border border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] p-3">
              <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                {readyable.length} {readyable.length === 1 ? "draft has" : "drafts have"} nothing left to fix
                {kind !== "all" || status !== "all" || debouncedSearch ? " in this list" : ""}.
              </p>
              <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                The first card set ready fills today, and the planner fills the next seven days from the ready cards.
              </p>
              {bulk ? (
                <Button type="button" size="sm" isLoading disabled>
                  Setting ready {bulk.done} of {bulk.total}
                </Button>
              ) : (
                <ConfirmButton variant="primary" size="sm" confirmLabel={`Yes, set ${readyable.length} ready`} onConfirm={setAllReady}>
                  Set {readyable.length} ready
                </ConfirmButton>
              )}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
            {listQuery.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : visible.length ? (
              <ul className="divide-y divide-[var(--sb-border)]">
                {visible.map((card) => {
                  const state = cardState(card);
                  const isSelected = card.id === selected?.id && !newKind;
                  return (
                    <li key={card.id} className="relative">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => open(card)}
                        className={cn(
                          "flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors duration-[var(--sb-duration-fast)]",
                          isSelected ? "bg-[var(--sb-accent-soft)]" : "hover:bg-[var(--sb-surface-2)]",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-0 left-0 w-[2px] bg-[var(--sb-accent)] transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                            {card.headword}
                          </span>
                          <span className="mt-0.5 block truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            {KIND_LABEL[card.kind]} · {cameOutLine(card)}
                            {card.plannedFor[0] ? ` · next ${formatDay(card.plannedFor[0])}` : ""}
                            {!card.plannedFor[0] && card.shownOn[0] ? ` · shown ${formatDay(card.shownOn[0])}` : ""}
                          </span>
                        </span>
                        <Badge tone={state.tone}>{state.label}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<BookType className="h-4 w-4" />}
                title={totalReady + totalDraft === 0 ? "No cards yet" : "Nothing here"}
                description={
                  totalReady + totalDraft === 0
                    ? "Upload the cards file from the content pipeline to start."
                    : "Try another filter, or clear the search."
                }
                action={
                  totalReady + totalDraft === 0 ? (
                    <Button asChild href="/words/upload">
                      <Upload className="h-4 w-4" />
                      Upload cards
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={listQuery.data?.total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => startNew("WORD")}>
              <Plus className="h-3.5 w-3.5" />
              New word
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => startNew("IDIOM")}>
              <Plus className="h-3.5 w-3.5" />
              New idiom
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => startNew("PHRASAL_VERB")}>
              <Plus className="h-3.5 w-3.5" />
              New phrasal verb
            </Button>
          </div>
        </section>

        <div ref={panelRef} className="min-w-0 scroll-mt-20">
          {newKind ? (
            <WordCardPanel
              key={`new-${newKind}`}
              card={null}
              newKind={newKind}
              onDirtyChange={onDirtyChange}
              onCancelNew={() => {
                if (!leaveOk()) return;
                dirty.current = false;
                setNewKind(null);
              }}
              onSaved={async (saved) => {
                dirty.current = false;
                setNewKind(null);
                setSelectedId(saved.id);
                await refresh();
              }}
            />
          ) : selected ? (
            <WordCardPanel
              key={selected.id}
              card={selected}
              onDirtyChange={onDirtyChange}
              onSaved={async () => {
                await refresh();
              }}
              onDeleted={async () => {
                dirty.current = false;
                setSelectedId(null);
                await refresh();
              }}
            />
          ) : listQuery.isLoading || linkedQuery.isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
