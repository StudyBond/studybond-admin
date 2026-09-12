"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { useAdminSubjectCatalogue } from "@/features/institutions/hooks/use-admin-institutions";
import { adminInstitutionsApi } from "@/lib/api/admin-institutions";
import type { AdminSubjectCatalogueItem } from "@/lib/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The student app maps these keys to real icons. Anything it does not
 * recognise falls back to a badge showing the subject's short code, which is
 * safe but plain — so the picker only offers keys that resolve.
 */
const ICON_OPTIONS = [
  "book-a",
  "book-open",
  "book-marked",
  "calculator",
  "sigma",
  "atom",
  "flask-conical",
  "test-tube",
  "dna",
  "microscope",
  "leaf",
  "heart-pulse",
  "brain",
  "cpu",
  "landmark",
  "gavel",
  "scale",
  "scroll",
  "coins",
  "banknote",
  "globe",
  "map",
  "languages",
  "music",
  "palette",
].map((value) => ({ label: value, value }));

/** Palette tokens the student app knows. Unknown ones fall back to slate. */
const COLOUR_OPTIONS = [
  "rose",
  "sky",
  "blue",
  "violet",
  "indigo",
  "purple",
  "fuchsia",
  "emerald",
  "green",
  "lime",
  "teal",
  "cyan",
  "amber",
  "orange",
  "slate",
].map((value) => ({ label: value, value }));

export default function SubjectCataloguePage() {
  const queryClient = useQueryClient();
  const catalogueQuery = useAdminSubjectCatalogue();

  const { data: session } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const isSuperadmin = session?.user?.role === "SUPERADMIN";
  const canEdit = Boolean(isSuperadmin && isStepUpActive);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [aliases, setAliases] = useState("");
  const [iconName, setIconName] = useState("book-open");
  const [colorToken, setColorToken] = useState("slate");

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "subject-catalogue"] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      adminInstitutionsApi.createSubject(
        {
          canonicalName: name.trim(),
          code: code.trim().toUpperCase(),
          aliases: aliases
            .split(",")
            .map((alias) => alias.trim())
            .filter(Boolean),
          iconName,
          colorToken,
        },
        { stepUpToken: stepUp?.stepUpToken },
      ),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      setName("");
      setCode("");
      setAliases("");
      setIconName("book-open");
      setColorToken("slate");
      await refresh();
    },
    onError: (error) => {
      toast.error("Could not add this subject", {
        description: (
          <ApiErrorMessage error={error} fallback="Check the name and code are not already used." />
        ),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: number;
      patch: { iconName?: string; colorToken?: string; isActive?: boolean };
    }) =>
      adminInstitutionsApi.updateSubject(input.id, input.patch, {
        stepUpToken: stepUp?.stepUpToken,
      }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refresh();
    },
    onError: (error) => {
      toast.error("Could not update this subject", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const isComplete = name.trim().length >= 2 && code.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/institutions"
          className="inline-flex items-center gap-1.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)] hover:text-[var(--sb-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Institutions
        </Link>
      </div>

      <PageHeader
        title="Subject catalogue"
        description="Every subject any institution can offer. Adding one here does not switch it on anywhere; you then attach it to an institution."
      />

      {!canEdit ? (
        <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] px-3 py-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
          {!isSuperadmin
            ? "Only a superadmin can change the catalogue."
            : "Verify with step-up before changing the catalogue."}
        </p>
      ) : null}

      <section className="space-y-3">
        <SectionTitle title="Add a subject" description="Name and code are permanent-ish: questions are matched to subjects by name." />

        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Name"
              id="subject-name"
              placeholder="Economics"
              disabled={!canEdit || createMutation.isPending}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Field
              label="Short code"
              hint="Shown when there is no icon"
              id="subject-code"
              placeholder="ECO"
              disabled={!canEdit || createMutation.isPending}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <Field
              label="Other spellings"
              hint="Comma separated, used on upload"
              id="subject-aliases"
              placeholder="Econs, Economic"
              disabled={!canEdit || createMutation.isPending}
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
            />

            <div className="space-y-1.5">
              <span className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
                Icon
              </span>
              <CustomSelect
                value={iconName}
                onValueChange={setIconName}
                options={ICON_OPTIONS}
                disabled={!canEdit || createMutation.isPending}
                aria-label="Icon"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
                Colour
              </span>
              <CustomSelect
                value={colorToken}
                onValueChange={setColorToken}
                options={COLOUR_OPTIONS}
                disabled={!canEdit || createMutation.isPending}
                aria-label="Colour"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canEdit || !isComplete || createMutation.isPending}
              isLoading={createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Add subject
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="In the catalogue"
          description={
            catalogueQuery.data
              ? `${catalogueQuery.data.subjects.length} subject${catalogueQuery.data.subjects.length === 1 ? "" : "s"}`
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
            {catalogueQuery.data?.subjects.map((subject: AdminSubjectCatalogueItem) => (
              <div
                key={subject.id}
                className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4"
              >
                <div className="min-w-0">
                  <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                    {subject.canonicalName}{" "}
                    <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      {subject.code}
                    </span>{" "}
                    {!subject.isActive ? <Badge tone="warning">Switched off</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                    Offered by {subject.institutionCount} institution
                    {subject.institutionCount === 1 ? "" : "s"}
                    {subject.aliases.length > 0 ? ` · also written ${subject.aliases.join(", ")}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-36 space-y-1.5">
                    <span className="block text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                      Icon
                    </span>
                    <CustomSelect
                      size="sm"
                      value={subject.iconName}
                      onValueChange={(value) =>
                        updateMutation.mutate({ id: subject.id, patch: { iconName: value } })
                      }
                      options={ICON_OPTIONS}
                      disabled={!canEdit || updateMutation.isPending}
                      aria-label={`Icon for ${subject.canonicalName}`}
                    />
                  </div>

                  <div className="w-32 space-y-1.5">
                    <span className="block text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                      Colour
                    </span>
                    <CustomSelect
                      size="sm"
                      value={subject.colorToken}
                      onValueChange={(value) =>
                        updateMutation.mutate({ id: subject.id, patch: { colorToken: value } })
                      }
                      options={COLOUR_OPTIONS}
                      disabled={!canEdit || updateMutation.isPending}
                      aria-label={`Colour for ${subject.canonicalName}`}
                    />
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canEdit || updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: subject.id,
                        patch: { isActive: !subject.isActive },
                      })
                    }
                  >
                    {subject.isActive ? "Switch off" : "Switch on"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
