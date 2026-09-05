"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { QuestionForm } from "@/features/questions/components/question-form";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionPayload } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewQuestionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Add a question"
        description="Write the question, attach any images, and choose which pool it belongs to."
        action={
          <Button asChild href="/questions" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to questions
          </Button>
        }
      />

      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
        <QuestionForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
        />
      </div>
    </div>
  );
}
