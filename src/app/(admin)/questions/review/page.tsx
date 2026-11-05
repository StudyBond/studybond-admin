"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { QuestionReviewer } from "@/features/questions/components/question-reviewer";
import { ReviewFiltersBar } from "@/features/questions/components/review-filters";
import { ReviewList } from "@/features/questions/components/review-list";
import {
  REVIEW_BATCH_SIZE,
  useReviewFacets,
  useReviewQueue,
} from "@/features/questions/hooks/use-admin-questions";
import {
  useLeaveGuard,
  type UnsavedDraft,
} from "@/features/questions/hooks/use-leave-guard";
import { useQuestionInstitution } from "@/features/questions/hooks/use-question-institution";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  loadSavedPlace,
  readPlace,
  savePlace,
  toQueueQuery,
  writePlace,
  type ReviewFilters,
  type ReviewPlace,
  type ReviewView,
} from "@/features/questions/lib/review-place";
import {
  flatten,
  keyOf,
  loadedFrom,
  neighbourOf,
  pickCurrent,
  type QueueKey,
} from "@/features/questions/lib/review-queue";
import { notifyContentWarnings } from "@/features/questions/lib/content-warnings";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionListItem, QuestionPayload } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PartyPopper, SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Where content review actually happens.
 *
 * Two views onto the same filtered set. Queue is the default: one question
 * at a time, its live rendered form on top, editable fields with a
 * formatting toolbar below, and Publish/Verify/Save always on screen. List
 * is the same questions as a scannable table, for ticking several at once
 * and bulk-publishing a batch already known to be fine.
 *
 * The reviewer's place - filters, view and the question open - is kept in
 * the address and saved per board (see review-place.ts). A reload, a shared
 * link or a return from the sidebar opens on the same question, and the
 * queue loads from there rather than from the top, so it is instant however
 * deep in the backlog the question is. Earlier questions load on the way back.
 */

/** How close to either end of the loaded questions the next batch starts loading. */
const PREFETCH_AHEAD = 10;

const START_OF_QUEUE: ReviewPlace = { filters: DEFAULT_FILTERS, view: "queue", at: null };

function positiveInt(value: string | null) {
  const number = Number.parseInt(value ?? "", 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ReviewQueueContent />
    </Suspense>
  );
}

function ReviewQueueContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  /* The open question's unsaved edits, reported by the reviewer. Every change
     that could replace the open question goes through guard, which asks first
     when there are any. */
  const draftRef = useRef<UnsavedDraft | null>(null);
  const { guard, isOpen: guardOpen, dialog } = useLeaveGuard(draftRef);
  const { institutionCode, setInstitutionCode, institutions, isReady } =
    useQuestionInstitution();

  const [filters, setFilters] = useState<ReviewFilters>(DEFAULT_FILTERS);
  const [mode, setMode] = useState<ReviewView>("queue");
  const [current, setCurrent] = useState<QueueKey | null>(null);
  /* The question the loaded queue starts at, or null for the top. Set when a
     place is restored or a question is linked; any filter change clears it. */
  const [startAt, setStartAt] = useState<number | null>(null);
  /* Nothing loads until the place is read, so the first request is the right one. */
  const [restored, setRestored] = useState(false);
  const [seekId, setSeekId] = useState<number | null>(null);
  /* A linked question to check for once the queue has loaded. */
  const expectedLink = useRef<number | null>(null);

  function applyPlace(place: ReviewPlace | null) {
    const next = place ?? START_OF_QUEUE;
    setFilters(next.filters);
    setMode(next.view);
    setCurrent(next.at ? { id: next.at } : null);
    setStartAt(next.at);
  }

  const linkedId = positiveInt(searchParams.get("question"));
  const handledLink = useRef<number | null>(null);

  /* Put the reviewer back where they were: the address first (a reload or a
     shared link), otherwise the place last saved for this board. */
  useEffect(() => {
    if (!isReady || restored) return;
    const board = searchParams.get("board");
    if (board && board !== institutionCode) setInstitutionCode(board);
    applyPlace(readPlace(searchParams) ?? loadSavedPlace(board ?? institutionCode));
    // A linked question replaces this place, so hold the queue until it is found.
    if (linkedId !== null) setSeekId(linkedId);
    setRestored(true);
  }, [isReady, restored, searchParams, linkedId, institutionCode, setInstitutionCode]);

  const queueFilters = useMemo(
    () => toQueueQuery(filters, institutionCode),
    [filters, institutionCode],
  );
  const queueQuery = useReviewQueue(queueFilters, startAt, {
    enabled: isReady && restored && seekId === null,
  });
  const facetsQuery = useReviewFacets(queueFilters, { enabled: isReady && restored });

  const {
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
  } = queueQuery;
  const pages = queueQuery.data?.pages;
  const questions = useMemo(() => flatten(pages), [pages]);
  const offset = loadedFrom(pages);
  const total = pages?.at(-1)?.meta.total ?? 0;
  const order = filters.order;
  const currentQuestion = pickCurrent(questions, current, order);
  const currentIndex = currentQuestion ? questions.indexOf(currentQuestion) : -1;
  const placeAt = currentQuestion?.id ?? current?.id ?? null;

  /* Keep the address and the saved place up to date as the reviewer moves.
     Replaced rather than pushed, so Back still leaves the page. */
  useEffect(() => {
    if (!restored || seekId !== null) return;
    const place: ReviewPlace = { filters, view: mode, at: placeAt };
    savePlace(place, institutionCode);
    const search = `?${writePlace(place, institutionCode)}`;
    if (window.location.search !== search) {
      window.history.replaceState(null, "", `${window.location.pathname}${search}`);
    }
  }, [restored, seekId, filters, mode, placeAt, institutionCode]);

  /* Start the next batch while the reviewer is still near either end of the
     loaded ones, so moving on rarely waits on the network. Only in the
     queue: in the list, rows appearing above would push the table down. */
  useEffect(() => {
    if (mode !== "queue" || currentIndex < 0) return;
    if (hasNextPage && !isFetchingNextPage && currentIndex >= questions.length - PREFETCH_AHEAD) {
      void fetchNextPage();
    }
    if (hasPreviousPage && !isFetchingPreviousPage && currentIndex < PREFETCH_AHEAD) {
      void fetchPreviousPage();
    }
  }, [
    mode,
    currentIndex,
    questions.length,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
  ]);

  /* A saved place past the end of the queue (everything after it has been
     published since) opens on an empty batch. Start from the top instead. */
  useEffect(() => {
    if (startAt !== null && queueQuery.isSuccess && questions.length === 0 && total > 0) {
      setStartAt(null);
    }
  }, [startAt, queueQuery.isSuccess, questions.length, total]);

  /* ?question=123 opens that question, from the Pictures page or a shared
     link: its board and subject, other filters cleared, the order kept. A
     question that is already live is not in review, so it opens in the
     editor instead. */
  useEffect(() => {
    if (!restored || linkedId === null || handledLink.current === linkedId) return;
    handledLink.current = linkedId;
    setSeekId(linkedId);
    void (async () => {
      try {
        const linked = await questionsApi.getById(linkedId);
        if (linked.reviewStatus === "PUBLISHED") {
          toast.info(`#${linked.id} is already published, so it opens in the editor.`);
          router.replace(`/questions/${linked.id}`);
          return;
        }
        setInstitutionCode(linked.institutionCode ?? institutionCode);
        setFilters((previous) => ({
          ...DEFAULT_FILTERS,
          order: previous.order,
          subject: linked.subject,
        }));
        setMode("queue");
        setCurrent({ id: linked.id, year: linked.year ?? null });
        setStartAt(linked.id);
        expectedLink.current = linked.id;
      } catch {
        toast.error(`Could not open question #${linkedId}.`);
      } finally {
        setSeekId(null);
      }
    })();
  }, [restored, linkedId, router, institutionCode, setInstitutionCode]);

  useEffect(() => {
    const expected = expectedLink.current;
    if (expected === null || !queueQuery.isSuccess) return;
    expectedLink.current = null;
    if (!questions.some((question) => question.id === expected)) {
      toast.error(`#${expected} is not waiting on review.`);
    }
  }, [queueQuery.isSuccess, questions]);

  /** Any filter change starts the queue again from the top. */
  function changeFilters(patch: Partial<ReviewFilters>) {
    guard(() => {
      setFilters((previous) => ({ ...previous, ...patch }));
      setCurrent(null);
      setStartAt(null);
    });
  }

  /** Each board keeps its own place, so switching back finds the reviewer where they were. */
  function changeBoard(code: string) {
    guard(() => {
      setInstitutionCode(code);
      applyPlace(loadSavedPlace(code));
    });
  }

  async function refreshQueue() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload: QuestionPayload) => {
      if (!currentQuestion) throw new Error("No question is open.");
      return questionsApi.update(currentQuestion.id, payload);
    },
    onSuccess: async (saved) => {
      // The reviewer is quiet on a clean save on purpose - it moves straight to
      // the next question, and a toast for every one would be noise. A warning
      // is the exception: it is about the question just left behind.
      if (saved.contentWarnings?.length) {
        notifyContentWarnings(saved, "Saved");
      }
      await refreshQueue();
    },
    onError: (error) => {
      toast.error("Could not save this question", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (input: { questionIds: number[]; reviewStatus: "VERIFIED" | "PUBLISHED" }) =>
      questionsApi.bulkUpdateReviewStatus(input),
    onSuccess: async (data) => {
      // Some were held back because their picture is not on yet.
      if (data.skippedIds?.length) toast.warning(data.message);
      else toast.success(data.message);
      await refreshQueue();
    },
    onError: (error) => {
      toast.error("Could not update those questions", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  /** Loads one more batch at either end. Null if it failed or added nothing. */
  async function loadMore(direction: 1 | -1, loaded: number) {
    const result = direction === 1 ? await fetchNextPage() : await fetchPreviousPage();
    if (result.isError) {
      toast.error("Could not load those questions. Please try again.");
      return null;
    }
    const list = flatten(result.data?.pages);
    if (list.length <= loaded) return null;
    return {
      list,
      offset: loadedFrom(result.data?.pages),
      more: direction === 1 ? result.hasNextPage : result.hasPreviousPage,
    };
  }

  /* Moves one question forward or back, loading the next batch first when
     the move goes past the loaded ones. The move is worked out from the
     question's place in the order, not its old index, so it still lands on
     the right one after the open question has been published and left. */
  async function step(from: QuestionListItem | null, direction: 1 | -1) {
    if (!from) return;
    const key = keyOf(from);
    let list = questions;
    let target = neighbourOf(list, key, order, direction);
    let more = direction === 1 ? hasNextPage : hasPreviousPage;
    while (!target && more) {
      const loaded = await loadMore(direction, list.length);
      if (!loaded) return;
      ({ list, more } = loaded);
      target = neighbourOf(list, key, order, direction);
    }
    if (target) setCurrent(keyOf(target));
  }

  /* Opens the question at a position in the whole queue. One batch away is
     loaded on; further than that, the question at that position is looked
     up and the queue reopens on it, rather than loading everything between. */
  async function goToPosition(position: number) {
    let list = questions;
    let from = offset;
    let moreAfter = hasNextPage;
    let moreBefore = hasPreviousPage;
    for (;;) {
      const index = position - 1 - from;
      if (index >= 0 && index < list.length) {
        setCurrent(keyOf(list[index]));
        return;
      }
      const direction = index < 0 ? -1 : 1;
      const near = direction === 1 ? index < list.length + REVIEW_BATCH_SIZE : index >= -REVIEW_BATCH_SIZE;
      if (!near || !(direction === 1 ? moreAfter : moreBefore)) break;
      const loaded = await loadMore(direction, list.length);
      if (!loaded) return;
      list = loaded.list;
      from = loaded.offset;
      if (direction === 1) moreAfter = loaded.more;
      else moreBefore = loaded.more;
    }
    try {
      const found = await questionsApi.list({ ...queueFilters, page: position, limit: 1 });
      const target = found.questions[0];
      if (!target) return;
      setCurrent(keyOf(target));
      setStartAt(target.id);
    } catch {
      toast.error("Could not open that question. Please try again.");
    }
  }

  const filtered = activeFilterCount(filters) > 0;
  const showingTotal = queueQuery.data ? total : null;

  return (
    <div className="sb-enter space-y-5 pb-2">
      <PageHeader
        title="Content review"
        description="Everything not yet published, checked and edited in the same place it will be seen."
        action={
          <Button asChild href="/questions" variant="secondary">
            Question bank
          </Button>
        }
      />

      <ReviewFiltersBar
        filters={filters}
        onChange={changeFilters}
        facets={facetsQuery.data}
        institutionCode={institutionCode}
        institutions={institutions}
        onInstitutionChange={changeBoard}
        view={mode}
        onViewChange={(view) => guard(() => setMode(view))}
        total={showingTotal}
      />

      {seekId !== null ? (
        <div className="space-y-2">
          <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            Finding #{seekId} in the queue…
          </p>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : !isReady || !restored || queueQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : queueQuery.isError && !queueQuery.data ? (
        <ErrorState
          title="Could not load the review queue"
          error={queueQuery.error}
          onRetry={() => queueQuery.refetch()}
        />
      ) : questions.length === 0 ? (
        filtered ? (
          <div className="flex flex-col items-center gap-3 rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border)] px-6 py-16 text-center">
            <SearchX className="h-6 w-6 text-[var(--sb-text-tertiary)]" />
            <div>
              <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                No questions match these filters
              </p>
              <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                Nothing in {institutionCode} fits every filter above.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => changeFilters({ ...DEFAULT_FILTERS, order })}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border)] px-6 py-16 text-center">
            <PartyPopper className="h-6 w-6 text-[var(--sb-text-tertiary)]" />
            <div>
              <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                Nothing waiting on review
              </p>
              <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                Every {institutionCode} question is already published. Questions
                uploaded under another institution only show when it is picked
                above.
              </p>
            </div>
          </div>
        )
      ) : mode === "queue" && currentQuestion ? (
        <QuestionReviewer
          key={currentQuestion.id}
          question={currentQuestion}
          position={offset + currentIndex + 1}
          total={total}
          hasPrevious={currentIndex > 0 || hasPreviousPage}
          hasNext={currentIndex < questions.length - 1 || hasNextPage}
          onPrevious={() => guard(() => void step(currentQuestion, -1))}
          onNext={() => guard(() => void step(currentQuestion, 1))}
          onSkip={() => guard(() => void step(currentQuestion, 1))}
          onSubmit={(payload) => saveMutation.mutateAsync(payload)}
          isSaving={saveMutation.isPending}
          onGoTo={(position) => guard(() => void goToPosition(position))}
          draftRef={draftRef}
          shortcutsPaused={guardOpen}
        />
      ) : (
        <ReviewList
          questions={questions}
          total={total}
          isLoading={false}
          onRetry={() => queueQuery.refetch()}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={() => void fetchNextPage()}
          offset={offset}
          isLoadingEarlier={isFetchingPreviousPage}
          onLoadEarlier={() => void fetchPreviousPage()}
          onOpen={(id) => {
            const opened = questions.find((question) => question.id === id);
            setCurrent(opened ? keyOf(opened) : { id });
            setMode("queue");
          }}
          onBulkPublish={(ids) =>
            bulkMutation.mutateAsync({ questionIds: ids, reviewStatus: "PUBLISHED" })
          }
          onBulkVerify={(ids) =>
            bulkMutation.mutateAsync({ questionIds: ids, reviewStatus: "VERIFIED" })
          }
          isBulkUpdating={bulkMutation.isPending}
        />
      )}

      {dialog}
    </div>
  );
}
