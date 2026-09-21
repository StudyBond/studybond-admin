"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminCourses } from "@/features/courses/hooks/use-admin-courses";
import { adminCoursesApi } from "@/lib/api/admin-courses";
import type { AdminCourseItem } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListFilter, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function parseAliases(value: string): string[] {
  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function CourseRow({
  course,
  canEdit,
  onSaveAliases,
  onToggleActive,
  isSaving,
}: {
  course: AdminCourseItem;
  canEdit: boolean;
  onSaveAliases: (courseId: number, aliases: string[]) => void;
  onToggleActive: (course: AdminCourseItem) => void;
  isSaving: boolean;
}) {
  const [aliasesInput, setAliasesInput] = useState(course.aliases.join(", "));
  const hasChanges =
    parseAliases(aliasesInput).join(", ") !== course.aliases.join(", ") &&
    parseAliases(aliasesInput).join(",") !== course.aliases.join(",");

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
          {course.canonicalName}{" "}
          {!course.isActive ? <Badge tone="warning">Switched off</Badge> : null}
        </p>
        <div className="mt-2 max-w-md">
          <Field
            label="Also written as"
            hint="Comma separated. Matched case- and spacing-insensitively."
            value={aliasesInput}
            disabled={!canEdit || isSaving}
            onChange={(event) => setAliasesInput(event.target.value)}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canEdit || !hasChanges || isSaving}
          onClick={() => onSaveAliases(course.id, parseAliases(aliasesInput))}
        >
          Save
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canEdit || isSaving}
          onClick={() => onToggleActive(course)}
        >
          {course.isActive ? "Switch off" : "Switch on"}
        </Button>
      </div>
    </div>
  );
}

export default function CoursesCataloguePage() {
  const queryClient = useQueryClient();
  const catalogueQuery = useAdminCourses();

  const { data: session } = useAdminSession();
  const canEdit =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      adminCoursesApi.create({
        canonicalName: name.trim(),
        aliases: parseAliases(aliases),
      }),
    onSuccess: async () => {
      toast.success(`${name.trim()} added to the catalogue`);
      setName("");
      setAliases("");
      await refresh();
    },
    onError: (error) => {
      toast.error("Could not add this course", {
        description: (
          <ApiErrorMessage error={error} fallback="Check the name is not already used." />
        ),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: number;
      patch: { aliases?: string[]; isActive?: boolean };
    }) => adminCoursesApi.update(input.id, input.patch),
    onSuccess: async () => {
      toast.success("Course updated");
      await refresh();
    },
    onError: (error) => {
      toast.error("Could not update this course", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const isComplete = name.trim().length >= 2;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course catalogue"
        description="The canonical aspiring-course list students match against on signup and in settings. Merging spellings here doesn't rewrite what students already saved until they save their profile again, or you promote a matching unmatched value below."
        action={
          <Link href="/courses/unmatched">
            <Button variant="secondary">
              <ListFilter className="h-4 w-4" />
              Unmatched values
            </Button>
          </Link>
        }
      />

      {!canEdit ? (
        <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] px-3 py-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
          Only an admin can change the catalogue.
        </p>
      ) : null}

      <section className="space-y-3">
        <SectionTitle
          title="Add a course"
          description="Students matching any of these spellings (case and spacing ignored) get the name below stored on their profile."
        />

        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Canonical name"
              id="course-name"
              placeholder="Medicine and Surgery"
              disabled={!canEdit || createMutation.isPending}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Field
              label="Other spellings"
              hint="Comma separated"
              id="course-aliases"
              placeholder="Medicine, MBBS, MB;BS"
              disabled={!canEdit || createMutation.isPending}
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
            />
          </div>

          <div className="mt-4">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canEdit || !isComplete || createMutation.isPending}
              isLoading={createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Add course
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="In the catalogue"
          description={
            catalogueQuery.data
              ? `${catalogueQuery.data.courses.length} course${catalogueQuery.data.courses.length === 1 ? "" : "s"}`
              : undefined
          }
        />

        {catalogueQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : catalogueQuery.error ? (
          <ErrorState
            title="Could not load the catalogue"
            error={catalogueQuery.error}
            onRetry={() => catalogueQuery.refetch()}
          />
        ) : (
          <div className="space-y-2">
            {catalogueQuery.data?.courses.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                canEdit={canEdit}
                isSaving={updateMutation.isPending}
                onSaveAliases={(id, nextAliases) =>
                  updateMutation.mutate({ id, patch: { aliases: nextAliases } })
                }
                onToggleActive={(target) =>
                  updateMutation.mutate({
                    id: target.id,
                    patch: { isActive: !target.isActive },
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
