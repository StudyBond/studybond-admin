"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field, FieldShell } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  QuestionReviewer,
  type QueueRailItem,
} from "@/features/questions/components/question-reviewer";
import { ReviewList } from "@/features/questions/components/review-list";
import { useAdminQuestions } from "@/features/questions/hooks/use-admin-questions";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionListItem, QuestionPayload } from "@/lib/api/types";
import { QUESTION_POOL_OPTIONS } from "@/lib/utils/questions";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, PartyPopper } from "lucide-react";
import { useState } from "react";
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
 * Fetches up to 100 questions in one request rather than paging — a
 * DRAFT/VERIFIED backlog is a working queue, not the whole bank, and one
 * request keeps Next/Previous instant with no page-boundary logic. If a
 * backlog ever outgrows 100 at once, narrowing by subject brings it back
 * under that.
 */

const STATUS_SCOPES = [
  { label: "Not yet published", value: "DRAFT,VERIFIED" },
  { label: "Draft only", value: "DRAFT" },
  { label: "Verified only", value: "VERIFIED" },
];

export default function ReviewQueuePage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"queue" | "list">("queue");
  const [subject, setSubject] = useState("");
  const [questionPool, setQuestionPool] = useState("");
  const [statusScope, setStatusScope] = useState(STATUS_SCOPES[0].value);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const debouncedSubject = useDebouncedValue(subject.trim(), 350);

  const questionsQuery = useAdminQuestions({
    reviewStatus: statusScope,
    subject: debouncedSubject || undefined,
    questionPool: questionPool || undefined,
    limit: 100,
  });

  const questions: QuestionListItem[] = questionsQuery.data?.questions ?? [];
  const total = questionsQuery.data?.meta.total ?? 0;
  const shownAllOf100 = questions.length === 100 && total > 100;

  const currentIndex = Math.max(
    0,
    questions.findIndex((q) => q.id === currentId),
  );
  const currentQuestion = questions[currentIndex] ?? null;

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

  function goToIndex(index: number) {
    const target = questions[index];
    if (target) setCurrentId(target.id);
  }

  const railItems: QueueRailItem[] = questions.map((q) => ({
    id: q.id,
    subject: q.subject,
    questionText: q.questionText,
    reviewStatus: q.reviewStatus,
  }));

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

      {shownAllOf100 ? (
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          Showing the first 100 of {total}. Narrow by subject to see the rest.
        </p>
      ) : null}

      {questionsQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : questionsQuery.isError ? (
        <ErrorState
          title="Could not load the review queue"
          error={questionsQuery.error}
          onRetry={() => questionsQuery.refetch()}
        />
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border)] px-6 py-16 text-center">
          <PartyPopper className="h-6 w-6 text-[var(--sb-text-tertiary)]" />
          <div>
            <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
              Nothing waiting on review
            </p>
            <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
              Every question in this scope is already published.
            </p>
          </div>
        </div>
      ) : mode === "queue" && currentQuestion ? (
        <QuestionReviewer
          key={currentQuestion.id}
          question={currentQuestion}
          position={currentIndex + 1}
          total={questions.length}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < questions.length - 1}
          onPrevious={() => goToIndex(currentIndex - 1)}
          onNext={() => goToIndex(currentIndex + 1)}
          onSkip={() => goToIndex(currentIndex + 1)}
          onSubmit={(payload) => saveMutation.mutateAsync(payload)}
          isSaving={saveMutation.isPending}
          railItems={railItems}
          currentId={currentQuestion.id}
          onJump={setCurrentId}
        />
      ) : (
        <ReviewList
          questions={questions}
          isLoading={false}
          onRetry={() => questionsQuery.refetch()}
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
