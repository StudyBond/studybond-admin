"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/page-header";
import { useAdminQuestions } from "@/features/questions/hooks/use-admin-questions";
import type { QuestionRecord } from "@/lib/api/types";
import { Plus } from "lucide-react";
import Link from "next/link";

/**
 * The questions that use one shared diagram, on the diagram's own page, with
 * the way to add another. Without it a group could be started but never
 * seen as a whole: you would have to search the bank for each member.
 */
export function GroupChildrenPanel({ parent }: { parent: QuestionRecord }) {
  const childrenQuery = useAdminQuestions({
    parentQuestionId: parent.id,
    institutionCode: parent.institutionCode ?? undefined,
    limit: 100,
    page: 1,
  });
  const children = childrenQuery.data?.questions ?? [];

  return (
    <section className="space-y-3">
      <SectionTitle
        title="Questions that use it"
        description="Each one shows this diagram above it, wherever it appears."
        action={
          <Button
            asChild
            href={`/questions/new?parentId=${parent.id}`}
            variant="secondary"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add a question
          </Button>
        }
      />
      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-2 sm:p-3">
        {childrenQuery.isLoading ? (
          <p className="p-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
            Loading…
          </p>
        ) : childrenQuery.isError ? (
          <p className="p-2 text-[length:var(--sb-text-sm)] text-[var(--sb-danger)]">
            Could not load the questions in this group.
          </p>
        ) : children.length === 0 ? (
          <p className="p-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            No question uses this diagram yet, so students never see it. Add
            the first one.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--sb-border)]">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/questions/${child.id}`}
                  className="flex items-start gap-3 rounded-[var(--sb-radius)] p-2.5 transition-colors hover:bg-[var(--sb-surface-2)]"
                >
                  <span className="sb-nums w-12 shrink-0 pt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    #{child.id}
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                    {child.questionText}
                  </span>
                  <Badge
                    tone={
                      child.reviewStatus === "PUBLISHED"
                        ? "success"
                        : child.reviewStatus === "DRAFT"
                          ? "warning"
                          : "info"
                    }
                  >
                    {child.reviewStatus === "PUBLISHED"
                      ? "Published"
                      : child.reviewStatus === "DRAFT"
                        ? "Draft"
                        : "Verified"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
