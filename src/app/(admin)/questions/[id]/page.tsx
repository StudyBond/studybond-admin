"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { QuestionForm } from "@/features/questions/components/question-form";
import { useAdminQuestion } from "@/features/questions/hooks/use-admin-question";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionPayload } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const questionId = Number.parseInt(params.id, 10);
  const router = useRouter();
  const queryClient = useQueryClient();
  const questionQuery = useAdminQuestion(Number.isFinite(questionId) ? questionId : undefined);

  const updateMutation = useMutation({
    mutationFn: (payload: QuestionPayload) => questionsApi.update(questionId, payload),
    onSuccess: async () => {
      toast.success("Question updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "questions", questionId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "analytics", "overview"] }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not update question", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => questionsApi.delete(questionId),
    onSuccess: async () => {
      toast.success("Question deleted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "analytics", "overview"] }),
      ]);
      router.push("/questions");
    },
    onError: (error) => {
      toast.error("Could not delete question", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Questions"
        title={questionQuery.data ? `Edit question #${questionQuery.data.id}` : "Edit question"}
        description="Update the prompt, asset attachments, explanation, and classification for an existing question."
      />

      {questionQuery.isLoading ? (
        <Surface className="p-6">
          <p className="text-sm text-[color:var(--muted-foreground)]">Loading question record...</p>
        </Surface>
      ) : null}

      {questionQuery.isError ? (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load this question.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage error={questionQuery.error} fallback="Please try again." />
          </p>
        </Surface>
      ) : null}

      {questionQuery.data ? (
        <Surface className="p-6">
          <QuestionForm
            mode="edit"
            initialQuestion={questionQuery.data}
            isSubmitting={updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
            onSubmit={(payload) => updateMutation.mutateAsync(payload)}
            onDelete={() => deleteMutation.mutateAsync()}
          />
        </Surface>
      ) : null}
    </section>
  );
}
