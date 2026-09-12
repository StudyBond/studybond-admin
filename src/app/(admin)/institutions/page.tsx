"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { AddInstitutionPanel } from "@/features/system/components/add-institution-panel";
import { useAdminInstitutions } from "@/features/institutions/hooks/use-admin-institutions";
import type { AdminInstitutionListItem } from "@/lib/api/types";
import { formatDate, formatInteger } from "@/lib/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

/**
 * Institutions.
 *
 * Everything about an exam — how many subjects make a full one, how long it
 * runs, which subjects exist — is scoped to an institution. Until now those
 * rules could only be changed by editing code or writing a migration, which
 * is why the platform could only really serve UI Post-UTME.
 *
 * The column worth reading is "Exam rules". An institution with no settings
 * of its own silently runs on the platform defaults, which are UI Post-UTME's:
 * four subjects, 100 questions, 90 minutes.
 */
export default function InstitutionsPage() {
  const queryClient = useQueryClient();
  const institutionsQuery = useAdminInstitutions();

  const columns: Column<AdminInstitutionListItem>[] = [
    {
      key: "code",
      header: "Code",
      primary: true,
      cell: (item) => (
        <span className="font-medium text-[var(--sb-text)]">{item.code}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (item) => item.name,
    },
    {
      key: "config",
      header: "Exam rules",
      cell: (item) =>
        item.hasExamConfig ? (
          <span className="text-[var(--sb-text-secondary)]">Its own</span>
        ) : (
          <Badge tone="warning">Platform defaults</Badge>
        ),
    },
    {
      key: "subjects",
      header: "Subjects",
      numeric: true,
      cell: (item) =>
        item.subjectCount === 0 ? (
          <Badge tone="warning">None set</Badge>
        ) : (
          formatInteger(item.subjectCount)
        ),
    },
    {
      key: "questions",
      header: "Questions",
      numeric: true,
      showFrom: "lg",
      cell: (item) => formatInteger(item.questionCount),
    },
    {
      key: "created",
      header: "Added",
      showFrom: "xl",
      cell: (item) => formatDate(item.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutions"
        description="Each institution carries its own exam rules and subject list."
      />

      <DataTable
        items={institutionsQuery.data?.institutions ?? []}
        columns={columns}
        getKey={(item) => item.id}
        href={(item) => `/institutions/${item.id}`}
        isLoading={institutionsQuery.isLoading}
        error={institutionsQuery.error}
        onRetry={() => institutionsQuery.refetch()}
        caption="Institutions"
        emptyTitle="No institutions yet"
        emptyDescription="Add one below to get started."
        emptyIcon={<Building2 className="h-5 w-5" />}
      />

      <AddInstitutionPanel
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "institutions"] });
        }}
      />
    </div>
  );
}
