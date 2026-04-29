"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { QuestionForm } from "@/features/questions/components/question-form";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionPayload } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
        queryClient.invalidateQueries({ queryKey: ["admin", "analytics", "overview"] }),
      ]);
      router.push(`/questions/${question.id}`);
    },
    onError: (error) => {
      toast.error("Could not create question", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Questions"
        title="Add question"
        description="Create a new question record, upload supporting media, and classify it into the correct content pool."
      />

      <Surface className="p-6">
        <QuestionForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
        />
      </Surface>
    </section>
  );
}
