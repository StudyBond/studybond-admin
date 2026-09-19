"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { BoardStatusControl } from "@/features/institutions/components/board-status-control";
import { ExamRulesForm } from "@/features/institutions/components/exam-rules-form";
import { InstitutionSubjectsEditor } from "@/features/institutions/components/institution-subjects-editor";
import {
  useAdminInstitution,
  useAdminSubjectCatalogue,
} from "@/features/institutions/hooks/use-admin-institutions";
import {
  adminInstitutionsApi,
  type AdminInstitutionStudentStatus,
} from "@/lib/api/admin-institutions";
import type {
  AdminInstitutionExamConfigInput,
  AdminInstitutionSubjectsInput,
} from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

/**
 * One institution's exam setup.
 *
 * Reading is open to any admin. Saving needs superadmin plus step-up, because
 * these settings decide how exams are built for every student here.
 */
export default function InstitutionDetailPage() {
  const params = useParams<{ id: string }>();
  const institutionId = Number(params?.id);
  const queryClient = useQueryClient();

  const { data: session } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const isSuperadmin = session?.user?.role === "SUPERADMIN";
  const canEdit = Boolean(isSuperadmin && isStepUpActive);

  const disabledReason = !isSuperadmin
    ? "Only a superadmin can change these settings."
    : !isStepUpActive
      ? "Verify with step-up before changing these settings."
      : undefined;

  const detailQuery = useAdminInstitution(
    Number.isFinite(institutionId) ? institutionId : null,
  );
  const catalogueQuery = useAdminSubjectCatalogue();

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "institution", institutionId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "institutions"] }),
    ]);
  }

  const configMutation = useMutation({
    mutationFn: (changes: AdminInstitutionExamConfigInput) =>
      adminInstitutionsApi.updateExamConfig(institutionId, changes, {
        stepUpToken: stepUp?.stepUpToken,
      }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refresh();
    },
    onError: (error) => {
      toast.error("Could not save these rules", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const subjectsMutation = useMutation({
    mutationFn: (payload: AdminInstitutionSubjectsInput) =>
      adminInstitutionsApi.replaceSubjects(institutionId, payload, {
        stepUpToken: stepUp?.stepUpToken,
      }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refresh();
    },
    onError: (error) => {
      toast.error("Could not save these subjects", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <ErrorState
        title="Could not load this institution"
        error={detailQuery.error}
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  const detail = detailQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/institutions"
          className="inline-flex items-center gap-1.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)] hover:text-[var(--sb-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All institutions
        </Link>
      </div>

      <PageHeader
        title={detail.institution.name}
        description={`${detail.institution.code} · /${detail.institution.slug}`}
        meta={
          detail.isUsingDefaultConfig ? (
            <Badge tone="warning">Running on platform defaults</Badge>
          ) : null
        }
      />

      {detail.warnings.length > 0 ? (
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-warning)] bg-[var(--sb-surface-1)] p-4">
          <p className="flex items-center gap-2 text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
            <AlertTriangle className="h-4 w-4 text-[var(--sb-warning)]" />
            Worth checking
          </p>
          <ul className="mt-2 space-y-1.5">
            {detail.warnings.map((warning) => (
              <li
                key={warning}
                className="text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]"
              >
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isStepUpActive && isSuperadmin ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4">
          <p className="text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
            These settings are read-only until you verify with step-up.
          </p>
          <Button asChild href="/settings" variant="secondary" size="sm">
            Verify on Settings
          </Button>
        </div>
      ) : null}

      <BoardStatusControl
        institutionId={institutionId}
        /* The generated contract has not been resynced yet, so this field is
           read defensively. It becomes a plain property once it has. */
        currentStatus={
          ((detail.institution as { studentStatus?: AdminInstitutionStudentStatus })
            .studentStatus ?? "OPEN")
        }
        canEdit={canEdit}
        disabledReason={disabledReason}
        stepUpToken={stepUp?.stepUpToken ?? null}
        onSaved={refresh}
      />

      <ExamRulesForm
        examConfig={detail.examConfig}
        canEdit={canEdit}
        disabledReason={disabledReason}
        isSaving={configMutation.isPending}
        onSave={(changes) => configMutation.mutate(changes)}
      />

      <InstitutionSubjectsEditor
        subjects={detail.subjects}
        catalogue={catalogueQuery.data?.subjects ?? []}
        maxSubjects={detail.examConfig.maxSubjects}
        fullExamQuestions={detail.examConfig.fullExamQuestions}
        fullExamDurationSeconds={detail.examConfig.fullExamDurationSeconds}
        canEdit={canEdit}
        disabledReason={disabledReason}
        isSaving={subjectsMutation.isPending}
        onSave={(payload) => subjectsMutation.mutate(payload)}
      />
    </div>
  );
}
