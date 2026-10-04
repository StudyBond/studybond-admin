"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field, FieldShell } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { QuestionReviewer } from "@/features/questions/components/question-reviewer";
import { ReviewList } from "@/features/questions/components/review-list";
import { InstitutionSelect } from "@/features/questions/components/institution-select";
import { useReviewQueue } from "@/features/questions/hooks/use-admin-questions";
import { useQuestionInstitution } from "@/features/questions/hooks/use-question-institution";
import {
  flatten,
  neighbourOf,
  pickCurrent,
  type QueueOrder,
} from "@/features/questions/lib/review-queue";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionListItem, QuestionPayload } from "@/lib/api/types";
import { QUESTION_POOL_OPTIONS } from "@/lib/utils/questions";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, PartyPopper } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
 * The queue is loaded 100 at a time by cursor (see useReviewQueue), so a
 * backlog of any size works. The admin chooses which end comes first. Oldest
 * is the default, so a backlog clears in the order it arrived.
 */

const STATUS_SCOPES = [
  { label: "Not yet published", value: "DRAFT,VERIFIED" },
  { label: "Draft only", value: "DRAFT" },
  { label: "Verified only", value: "VERIFIED" },
];

const ORDER_OPTIONS = [
  { label: "Oldest first", value: "oldest" },
  { label: "Newest first", value: "newest" },
];

/** How close to the end of the loaded questions the next batch starts loading. */
const PREFETCH_AHEAD = 10;

export default function ReviewQueuePage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"queue" | "list">("queue");
  const [subject, setSubject] = useState("");
  const [questionPool, setQuestionPool] = useState("");
  const [statusScope, setStatusScope] = useState(STATUS_SCOPES[0].value);
  const [order, setOrder] = useState<QueueOrder>("oldest");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const { institutionCode, setInstitutionCode, institutions, isReady } =
    useQuestionInstitution();

  const debouncedSubject = useDebouncedValue(subject.trim(), 350);

  const queueQuery = useReviewQueue(
    {
      institutionCode,
      reviewStatus: statusScope,
      subject: debouncedSubject || undefined,
      questionPool: questionPool || undefined,
      order,
    },
    { enabled: isReady },
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = queueQuery;
  const questions = useMemo(
    () => flatten(queueQuery.data?.pages),
    [queueQuery.data],
  );
  const total = queueQuery.data?.pages.at(-1)?.meta.total ?? 0;
  const currentQuestion = pickCurrent(questions, currentId, order);
  const currentIndex = currentQuestion ? questions.indexOf(currentQuestion) : -1;

  /* Start the next batch while the reviewer is still near the end of the
     loaded ones, so moving on rarely waits on the network. */
  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      currentIndex >= questions.length - PREFETCH_AHEAD
    ) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, currentIndex, questions.length]);

  async function refreshQueue() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload: QuestionPayload) => {
      if (!currentQuestion) throw new Error("No question is open.");
      return questionsApi.update(currentQuestion.id, payload);
    },
    onSuccess: async () => {
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
      toast.success(data.message);
      await refreshQueue();
    },
    onError: (error) => {
      toast.error("Could not update those questions", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  /* Moves one question forward or back. Going forward past the loaded ones
     fetches the next batch first. The move is worked out from the question's
     id, not its old index, so it still lands on the right one after the open
     question has been published and left the list. */
  async function step(from: QuestionListItem | null, direction: 1 | -1) {
    if (!from) return;
    let list = questions;
    let target = neighbourOf(list, from.id, order, direction);
    let more = hasNextPage;
    while (!target && direction === 1 && more) {
      const result = await fetchNextPage();
      if (result.isError) {
        toast.error("Could not load the next questions. Please try again.");
        return;
      }
      list = flatten(result.data?.pages);
      more = result.hasNextPage;
      target = neighbourOf(list, from.id, order, 1);
    }
    if (target) setCurrentId(target.id);
  }

  /* Opens the question at a position in the whole queue, loading batches
     until that position is reached. */
  async function goToPosition(position: number) {
    let list = questions;
    let more = hasNextPage;
    while (list.length < position && more) {
      const result = await fetchNextPage();
      if (result.isError) {
        toast.error("Could not load those questions. Please try again.");
        return;
      }
      list = flatten(result.data?.pages);
      more = result.hasNextPage;
    }
    const target = list[position - 1];
    if (target) setCurrentId(target.id);
  }

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Content review"
        description="Everything not yet published, checked and edited in the same place it will be seen."
        action={
          <Button asChild href="/questions" variant="secondary">
            Question bank
          </Button>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <InstitutionSelect
            value={institutionCode}
            onValueChange={(code) => {
              setInstitutionCode(code);
              setCurrentId(null);
            }}
            institutions={institutions}
          />
          <FieldShell label="Status">
            <CustomSelect
              aria-label="Which review statuses to show"
              value={statusScope}
              onValueChange={(value) => {
                setStatusScope(value);
                setCurrentId(null);
              }}
              options={STATUS_SCOPES}
            />
          </FieldShell>
          <FieldShell label="Subject">
            <Field
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
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
                setCurrentId(null);
              }}
              options={[{ label: "All pools", value: "" }, ...QUESTION_POOL_OPTIONS]}
              placeholder="All pools"
            />
          </FieldShell>
          <FieldShell label="Order">
            <CustomSelect
              aria-label="Which end of the queue comes first"
              value={order}
              onValueChange={(value) => {
                setOrder(value === "newest" ? "newest" : "oldest");
                setCurrentId(null);
              }}
              options={ORDER_OPTIONS}
            />
          </FieldShell>
        </div>

        <div className="flex gap-1 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-1">
          <Button
            type="button"
            variant={mode === "queue" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("queue")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Queue
          </Button>
          <Button
            type="button"
            variant={mode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("list")}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>
      </div>

      {!isReady || queueQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : queueQuery.isError && !queueQuery.data ? (
        <ErrorState
          title="Could not load the review queue"
          error={queueQuery.error}
          onRetry={() => queueQuery.refetch()}
        />
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border)] px-6 py-16 text-center">
          <PartyPopper className="h-6 w-6 text-[var(--sb-text-tertiary)]" />
          <div>
            <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
              Nothing waiting on review
            </p>
            <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
              Every {institutionCode} question in this scope is already
              published. Questions uploaded under another institution only
              show when it is picked above.
            </p>
          </div>
        </div>
      ) : mode === "queue" && currentQuestion ? (
        <QuestionReviewer
          key={currentQuestion.id}
          question={currentQuestion}
          position={currentIndex + 1}
          total={total}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < questions.length - 1 || hasNextPage}
          onPrevious={() => void step(currentQuestion, -1)}
          onNext={() => void step(currentQuestion, 1)}
          onSkip={() => void step(currentQuestion, 1)}
          onSubmit={(payload) => saveMutation.mutateAsync(payload)}
          isSaving={saveMutation.isPending}
          onGoTo={(position) => void goToPosition(position)}
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
          onOpen={(id) => {
            setCurrentId(id);
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
    </div>
  );
}
