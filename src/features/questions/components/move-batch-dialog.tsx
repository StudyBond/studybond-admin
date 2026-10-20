"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminInstitutions } from "@/features/institutions/hooks/use-admin-institutions";
import { questionsApi } from "@/lib/api/questions";
import type { BulkUploadBatch } from "@/lib/api/types";
import { formatInteger } from "@/lib/utils/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Building2, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

/**
 * Moves every question one upload created to another board, for a file that
 * went to the wrong one.
 *
 * Picking a board runs the move as a preview first. The backend checks
 * everything and saves nothing, so the admin sees how many questions will
 * move, and anything that stops it, before the one button that does it.
 * The button names the count and the board, so nobody confirms blind.
 */
export function MoveBatchDialog({
  batch,
  onClose,
}: {
  batch: BulkUploadBatch;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [targetCode, setTargetCode] = useState("");

  const institutionsQuery = useAdminInstitutions();
  const boardOptions = (institutionsQuery.data?.institutions ?? [])
    .filter((board) => board.isActive && board.code !== batch.institutionCode)
    .map((board) => ({ value: board.code, label: `${board.code} · ${board.name}` }));

  const previewQuery = useQuery({
    queryKey: ["admin", "bulk-upload-move-preview", batch.id, targetCode],
    queryFn: () => questionsApi.moveBatch(batch.id, targetCode, true),
    enabled: Boolean(targetCode),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const preview = previewQuery.data;

  const moveMutation = useMutation({
    mutationFn: () => questionsApi.moveBatch(batch.id, targetCode, false),
    onSuccess: async (result) => {
      toast.success(result.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "bulk-upload-history"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "institutions"] }),
      ]);
      onClose();
    },
    onError: (error) => {
      toast.error("Nothing was moved", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
      /* The preview may be out of date now, so check again. */
      void previewQuery.refetch();
    },
  });
  const isMoving = moveMutation.isPending;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || isMoving) return;
      /* An open board list closes on its own first. */
      if (document.querySelector('[role="listbox"]')) return;
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMoving, onClose]);

  const canMove = Boolean(preview && preview.toInstitutionCode === targetCode.toUpperCase()) && !previewQuery.isFetching;

  return createPortal(
    <div
      className="sb-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => (isMoving ? undefined : onClose())}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] p-5 shadow-[var(--sb-shadow-xl)] outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] bg-[var(--sb-bg-inset)] text-[var(--sb-text-secondary)]">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2
              id={titleId}
              className="text-[length:var(--sb-text-lg)] font-semibold text-[var(--sb-text)]"
            >
              Change the board for this upload
            </h2>
            <p className="break-words text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
              Every question from{" "}
              <span className="text-[var(--sb-text)]">{batch.fileName}</span>{" "}
              moves together. It is on{" "}
              <span className="font-medium text-[var(--sb-text)]">{batch.institutionCode}</span> now.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
            Move it to
          </span>
          {institutionsQuery.isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <CustomSelect
              aria-label="Board to move this upload to"
              value={targetCode}
              onValueChange={setTargetCode}
              options={boardOptions}
              placeholder="Choose a board"
              disabled={isMoving}
            />
          )}
          {institutionsQuery.isError ? (
            <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-danger)]">
              <ApiErrorMessage error={institutionsQuery.error} fallback="Could not load the boards." />
            </p>
          ) : null}
        </div>

        {/* What will happen, from the backend's own preview. */}
        {targetCode ? (
          <div className="space-y-3 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
            {previewQuery.isFetching && !preview ? (
              <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
                Checking what would move…
              </p>
            ) : previewQuery.isError ? (
              <div className="flex gap-2 text-[length:var(--sb-text-sm)] text-[var(--sb-danger)]">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <ApiErrorMessage error={previewQuery.error} fallback="This upload cannot be moved." />
              </div>
            ) : preview ? (
              <>
                <div className="flex items-center gap-2 text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                  <span>{preview.fromInstitutionCode}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--sb-text-tertiary)]" />
                  <span>{preview.toInstitutionCode}</span>
                </div>
                <dl className="space-y-1.5">
                  {[
                    ["Questions", formatInteger(preview.movedCount)],
                    [
                      "Subjects",
                      preview.subjects.map((entry) => `${entry.subject} (${formatInteger(entry.count)})`).join(", "),
                    ],
                    ["Years", preview.years.length ? preview.years.join(", ") : "None given"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {label}
                      </dt>
                      <dd className="min-w-0 text-right text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {preview.skipped.deleted + preview.skipped.elsewhere > 0 ? (
                  <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                    {[
                      preview.skipped.deleted
                        ? `${formatInteger(preview.skipped.deleted)} deleted since the upload`
                        : null,
                      preview.skipped.elsewhere
                        ? `${formatInteger(preview.skipped.elsewhere)} already moved one by one`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" and ")}
                    . Those stay where they are.
                  </p>
                ) : null}
                {preview.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="flex gap-2 text-[length:var(--sb-text-xs)] text-[var(--sb-warning)]"
                  >
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {warning}
                  </p>
                ))}
              </>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="button"
            className="sm:flex-1"
            disabled={!canMove || isMoving}
            isLoading={isMoving}
            onClick={() => moveMutation.mutate()}
          >
            {preview && canMove
              ? `Move ${formatInteger(preview.movedCount)} ${preview.movedCount === 1 ? "question" : "questions"} to ${preview.toInstitutionCode}`
              : "Move questions"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="sm:flex-1"
            disabled={isMoving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
