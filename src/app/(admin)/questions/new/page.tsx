"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParentSummary } from "@/features/questions/components/parent-picker";
import { QuestionForm } from "@/features/questions/components/question-form";
import { useAdminQuestion } from "@/features/questions/hooks/use-admin-question";
import type { FormState } from "@/features/questions/lib/question-form-state";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionPayload } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";

/**
 * Two ways in besides the plain "Add question":
 *   ?parentId=123  starts a question already attached to shared diagram 123,
 *                  taking its subject, year and pool, so a group of questions
 *                  is entered one after another without picking it each time.
 *   ?kind=parent   starts a shared diagram.
 */
function NewQuestionContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const parentIdParam = Number.parseInt(searchParams.get("parentId") ?? "", 10);
  const parentId = Number.isFinite(parentIdParam) ? parentIdParam : undefined;
  const startsAsParent = searchParams.get("kind") === "parent";

  const parentQuery = useAdminQuestion(parentId);
  const parentRecord = parentQuery.data;

  const createMutation = useMutation({
    mutationFn: (payload: QuestionPayload) => questionsApi.create(payload),
    onSuccess: async (question) => {
      toast.success("Question created");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "analytics", "overview"],
        }),
      ]);
      router.push(`/questions/${question.id}`);
    },
    onError: (error) => {
      toast.error("Could not create this question", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const waitingForParent = parentId !== undefined && parentQuery.isLoading;

  const initialParent: ParentSummary | null = parentRecord
    ? {
        id: parentRecord.id,
        questionText: parentRecord.questionText,
        imageUrl: parentRecord.imageUrl ?? null,
        subject: parentRecord.subject,
        year: parentRecord.year ?? null,
        childCount: parentRecord.childCount ?? 0,
      }
    : null;

  const initialValues: Partial<FormState> | undefined = parentRecord
    ? {
        kind: "child",
        parentQuestionId: String(parentRecord.id),
        institutionCode: parentRecord.institutionCode ?? "ui",
        subject: parentRecord.subject,
        year: parentRecord.year != null ? String(parentRecord.year) : "",
        topic: parentRecord.topic ?? "",
        questionType: parentRecord.questionType,
        questionPool:
          parentRecord.questionPool === "FREE_EXAM"
            ? "REAL_BANK"
            : parentRecord.questionPool,
        // Held back until reviewed, like the rest of a batch entered in one go.
        reviewStatus: parentRecord.reviewStatus,
      }
    : startsAsParent
      ? { kind: "parent" }
      : undefined;

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title={
          parentRecord
            ? `Add a question to diagram #${parentRecord.id}`
            : startsAsParent
              ? "Add a shared diagram"
              : "Add a question"
        }
        description={
          parentRecord
            ? "It will show the diagram above it. Subject, year and pool are filled in from the diagram."
            : "Write the question, attach any images, and choose which pool it belongs to."
        }
        action={
          <Button asChild href="/questions" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to questions
          </Button>
        }
      />

      {waitingForParent ? (
        <Skeleton className="h-96 w-full" />
      ) : parentId !== undefined && parentQuery.isError ? (
        <ErrorState
          title="Could not load that shared diagram"
          error={parentQuery.error}
          onRetry={() => parentQuery.refetch()}
        />
      ) : (
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          <QuestionForm
            /* Remounts if the diagram it starts from changes. */
            key={parentRecord?.id ?? (startsAsParent ? "parent" : "blank")}
            mode="create"
            initialValues={initialValues}
            initialParent={initialParent}
            isSubmitting={createMutation.isPending}
            onSubmit={(payload) => createMutation.mutateAsync(payload)}
          />
        </div>
      )}
    </div>
  );
}

export default function NewQuestionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NewQuestionContent />
    </Suspense>
  );
}
