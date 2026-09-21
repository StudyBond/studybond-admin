"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import {
  useAdminCourses,
  useAdminUnmatchedCourses,
} from "@/features/courses/hooks/use-admin-courses";
import { adminCoursesApi } from "@/lib/api/admin-courses";
import type { AdminUnmatchedCourseValue } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function UnmatchedRow({
  value,
  courseOptions,
  canEdit,
  isPromoting,
  onPromoteToExisting,
  onPromoteToNew,
}: {
  value: AdminUnmatchedCourseValue;
  courseOptions: { label: string; value: string }[];
  canEdit: boolean;
  isPromoting: boolean;
  onPromoteToExisting: (rawValue: string, courseId: number) => void;
  onPromoteToNew: (rawValue: string, canonicalName: string) => void;
}) {
  const [existingCourseId, setExistingCourseId] = useState("");
  const [newName, setNewName] = useState(value.value);

  return (
    <div className="space-y-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
          &ldquo;{value.value}&rdquo;
        </p>
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
          {value.userCount} student{value.userCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-64 space-y-1.5">
          <span className="block text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
            Add as a spelling of
          </span>
          <CustomSelect
            size="sm"
            value={existingCourseId}
            onValueChange={setExistingCourseId}
            options={courseOptions}
            placeholder="Choose a course"
            disabled={!canEdit || isPromoting}
            aria-label={`Existing course for ${value.value}`}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canEdit || isPromoting || !existingCourseId}
          onClick={() => onPromoteToExisting(value.value, Number(existingCourseId))}
        >
          Add to course
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-64">
          <Field
            label="Or create a new course named"
            value={newName}
            disabled={!canEdit || isPromoting}
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canEdit || isPromoting || newName.trim().length < 2}
          onClick={() => onPromoteToNew(value.value, newName.trim())}
        >
          Create course
        </Button>
      </div>
    </div>
  );
}

export default function UnmatchedCoursesPage() {
  const queryClient = useQueryClient();
  const unmatchedQuery = useAdminUnmatchedCourses();
  const catalogueQuery = useAdminCourses();

  const { data: session } = useAdminSession();
  const canEdit =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  const courseOptions = (catalogueQuery.data?.courses ?? [])
    .filter((course) => course.isActive)
    .map((course) => ({ label: course.canonicalName, value: String(course.id) }));

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "unmatched"] }),
    ]);
  }

  const promoteMutation = useMutation({
    mutationFn: (input: { rawValue: string; courseId?: number; canonicalName?: string }) =>
      adminCoursesApi.promote(input),
    onSuccess: async (result) => {
      toast.success(
        `${result.usersUpdated} student${result.usersUpdated === 1 ? "" : "s"} moved to "${result.course.canonicalName}"`,
      );
      await refresh();
    },
    onError: (error) => {
      toast.error("Could not promote this value", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)] hover:text-[var(--sb-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Courses
        </Link>
      </div>

      <PageHeader
        title="Unmatched course values"
        description="What students typed that matches no course today, most common first. Promoting one updates every student who currently has that exact text, in addition to future signups."
      />

      {!canEdit ? (
        <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] px-3 py-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
          Only an admin can promote a value into the catalogue.
        </p>
      ) : null}

      {unmatchedQuery.isLoading || catalogueQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : unmatchedQuery.error ? (
        <ErrorState
          title="Could not load unmatched values"
          error={unmatchedQuery.error}
          onRetry={() => unmatchedQuery.refetch()}
        />
      ) : unmatchedQuery.data?.values.length === 0 ? (
        <p className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          Nothing unmatched right now &mdash; every student's aspiring course matches the catalogue.
        </p>
      ) : (
        <div className="space-y-2">
          {unmatchedQuery.data?.values.map((value) => (
            <UnmatchedRow
              key={value.value}
              value={value}
              courseOptions={courseOptions}
              canEdit={canEdit}
              isPromoting={promoteMutation.isPending}
              onPromoteToExisting={(rawValue, courseId) =>
                promoteMutation.mutate({ rawValue, courseId })
              }
              onPromoteToNew={(rawValue, canonicalName) =>
                promoteMutation.mutate({ rawValue, canonicalName })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
