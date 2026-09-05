"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionForm } from "@/features/questions/components/question-form";
import { useAdminQuestion } from "@/features/questions/hooks/use-admin-question";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionPayload } from "@/lib/api/types";
import { getQuestionPoolLabel } from "@/lib/utils/questions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const questionId = Number.parseInt(params.id, 10);
  const router = useRouter();
  const queryClient = useQueryClient();
  const questionQuery = useAdminQuestion(
    Number.isFinite(questionId) ? questionId : undefined,
  );
  const question = questionQuery.data;

  const updateMutation = useMutation({
    mutationFn: (payload: QuestionPayload) =>
      questionsApi.update(questionId, payload),
    onSuccess: async () => {
      toast.success("Question updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "questions", questionId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "analytics", "overview"],
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not save your changes", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => questionsApi.delete(questionId),
    onSuccess: async () => {
      toast.success("Question deleted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "analytics", "overview"],
        }),
      ]);
      router.push("/questions");
    },
    onError: (error) => {
      toast.error("Could not delete this question", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  if (questionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Question" description="Loading…" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (questionQuery.isError || !question) {
    return (
      <div className="sb-enter space-y-6">
        <PageHeader
          title="Question"
          action={
            <Button asChild href="/questions" variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to questions
            </Button>
          }
        />
        <ErrorState
          title="Could not load this question"
          error={questionQuery.error}
          onRetry={() => questionQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title={`Question #${question.id}`}
        description={question.subject}
        /* Which pool a question sits in decides who is served it, so it is
           worth seeing before you start editing rather than after you
           scroll down to the classification fields. */
        meta={
          <>
            <Badge tone="neutral">
              {getQuestionPoolLabel(question.questionPool)}
            </Badge>
            {question.year ? (
              <Badge tone="neutral">{question.year}</Badge>
            ) : null}
            {question.hasImage ? <Badge tone="info">Has image</Badge> : null}
          </>
        }
        action={
          <Button asChild href="/questions" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to questions
          </Button>
        }
      />

      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
        <QuestionForm
          /* Remounts when you move to a different question, so the form
             re-seeds from that record instead of syncing through an effect
             that could overwrite edits on a background refetch. */
          key={question.id}
          mode="edit"
          initialQuestion={question}
          isSubmitting={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          onSubmit={(payload) => updateMutation.mutateAsync(payload)}
          onDelete={() => deleteMutation.mutateAsync()}
        />
      </div>
    </div>
  );
}
