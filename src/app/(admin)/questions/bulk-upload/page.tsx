"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { computeFileHash, questionsApi } from "@/lib/api/questions";
import type { BulkUploadBatch, BulkUploadRowError } from "@/lib/api/types";
import { formatDateTime, formatInteger } from "@/lib/utils/format";
import { BULK_UPLOAD_COLUMNS } from "@/lib/utils/questions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileSpreadsheet,
  History,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Bulk import of questions from a spreadsheet.
 *
 * The duplicate-file dialog was a plain `<div>` over a backdrop: no
 * `role="dialog"`, no `aria-modal`, no Escape handler, no backdrop click,
 * and no focus management. It blocks the whole page and asks a question
 * whose wrong answer creates duplicate questions in the bank, so it is worth
 * getting right. It is now a real dialog — labelled, focus moved into it on
 * open and returned on close, dismissible with Escape or the backdrop.
 *
 * Everything visible also lost the off-palette white: the upload button, and
 * the file input's `file:bg-white` chip.
 *
 * The result panel showed four figures where three exist. "Created" and
 * "Created IDs" are the same number counted two ways.
 */

/* ── Duplicate confirmation ─────────────────────────── */

function DuplicateDialog({
  batch,
  onConfirm,
  onCancel,
}: {
  batch: BulkUploadBatch;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  /* Remembers what had focus so it can be handed back on close. */
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    /* Focus the dialog itself rather than a button, so the destructive
       action is never the thing sitting under a stray Enter press. */
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-title"
        tabIndex={-1}
        /* Clicks inside must not reach the dismissing backdrop. */
        onClick={(event) => event.stopPropagation()}
        className="sb-fade w-full max-w-md rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] p-5 shadow-[var(--sb-shadow-xl)] outline-none"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2
              id="duplicate-title"
              className="text-[length:var(--sb-text-lg)] font-semibold text-[var(--sb-text)]"
            >
              You have uploaded this file before
            </h2>
            <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
              A file with byte-for-byte identical contents was already
              imported. Uploading it again will create a second copy of every
              question in it.
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
          {[
            ["File", batch.fileName],
            ["Uploaded", formatDateTime(batch.createdAt)],
            ["Questions", formatInteger(batch.questionCount)],
            ["By", batch.uploaderName],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="shrink-0 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                {label}
              </dt>
              <dd className="min-w-0 truncate text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="button"
            variant="danger"
            className="sm:flex-1"
            onClick={onConfirm}
          >
            Upload it again anyway
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="sm:flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────── */

export default function BulkUploadPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [institutionCode, setInstitutionCode] = useState("");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof questionsApi.bulkUpload>
  > | null>(null);
  const [duplicateBatch, setDuplicateBatch] = useState<BulkUploadBatch | null>(
    null,
  );
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  const institutionCodeTrimmed = institutionCode.trim();
  const isInstitutionValid = institutionCodeTrimmed.length >= 2;

  const historyQuery = useQuery({
    queryKey: ["admin", "bulk-upload-history"],
    queryFn: () => questionsApi.bulkUploadHistory(undefined, 20),
    refetchOnWindowFocus: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (options: { hash: string }) => {
      if (!file) throw new Error("Choose a CSV or Excel file first.");
      return questionsApi.bulkUpload(
        file,
        institutionCodeTrimmed || undefined,
        options.hash,
      );
    },
    onSuccess: async (payload) => {
      setResult(payload);
      if (payload.success) {
        toast.success(`Imported ${payload.successCount} questions`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
          queryClient.invalidateQueries({
            queryKey: ["admin", "analytics", "overview"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["admin", "bulk-upload-history"],
          }),
        ]);
      } else {
        toast.error("Some rows could not be imported", {
          description: "The result panel lists every row that failed.",
        });
      }
    },
    onError: (error) => {
      toast.error("The upload failed", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const startUpload = useCallback(async () => {
    if (!file || !isInstitutionValid) return;

    setIsHashing(true);
    try {
      const hash = await computeFileHash(file);
      setPendingHash(hash);

      try {
        const check = await questionsApi.checkDuplicate(hash);
        if (check.isDuplicate && check.existingBatch) {
          setIsHashing(false);
          setDuplicateBatch(check.existingBatch);
          return;
        }
      } catch {
        /* A failed duplicate check should not block a legitimate upload. */
      }

      setIsHashing(false);
      uploadMutation.mutate({ hash });
    } catch {
      setIsHashing(false);
      toast.error("Could not read that file");
    }
  }, [file, isInstitutionValid, uploadMutation]);

  const confirmDuplicateUpload = useCallback(() => {
    setDuplicateBatch(null);
    if (pendingHash) uploadMutation.mutate({ hash: pendingHash });
  }, [pendingHash, uploadMutation]);

  const cancelDuplicateUpload = useCallback(() => {
    setDuplicateBatch(null);
    setPendingHash(null);
  }, []);

  const isBusy = isHashing || uploadMutation.isPending;

  const errorColumns: Column<BulkUploadRowError>[] = [
    {
      key: "row",
      header: "Row",
      primary: true,
      numeric: true,
      width: "5rem",
      cell: (error) => error.row,
    },
    {
      key: "field",
      header: "Column",
      width: "12rem",
      cell: (error) => (
        <span className="sb-mono text-[length:var(--sb-text-xs)]">
          {error.field}
        </span>
      ),
    },
    {
      key: "message",
      header: "What is wrong",
      cell: (error) => error.message,
    },
  ];

  const historyColumns: Column<BulkUploadBatch>[] = [
    {
      key: "file",
      header: "File",
      primary: true,
      cell: (batch) => (
        <span className="flex min-w-0 items-center gap-2">
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[var(--sb-text-tertiary)]" />
          <span className="truncate">{batch.fileName}</span>
        </span>
      ),
    },
    {
      key: "institution",
      header: "Institution",
      width: "8rem",
      cell: (batch) => <Badge tone="neutral">{batch.institutionCode}</Badge>,
    },
    {
      key: "imported",
      header: "Imported",
      numeric: true,
      width: "8rem",
      cell: (batch) => (
        <span>
          {formatInteger(batch.successCount)}
          <span className="text-[var(--sb-text-tertiary)]">
            /{formatInteger(batch.totalRows)}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "8rem",
      cell: (batch) =>
        batch.status === "COMPLETED" ? (
          <Badge tone="success">Completed</Badge>
        ) : (
          <Badge tone="danger" dot>
            Failed
          </Badge>
        ),
    },
    {
      key: "uploader",
      header: "Uploaded by",
      showFrom: "lg",
      cell: (batch) => batch.uploaderName,
    },
    {
      key: "date",
      header: "When",
      width: "11rem",
      showFrom: "lg",
      cell: (batch) => formatDateTime(batch.createdAt),
    },
  ];

  return (
    <>
      {duplicateBatch ? (
        <DuplicateDialog
          batch={duplicateBatch}
          onConfirm={confirmDuplicateUpload}
          onCancel={cancelDuplicateUpload}
        />
      ) : null}

      <div className="sb-enter space-y-6 pb-2">
        <PageHeader
          title="Bulk upload"
          description="Import many questions at once from a CSV or Excel file. Every row is validated before anything is saved, and identical files are caught before they create duplicates."
          action={
            <Button asChild href="/questions" variant="secondary">
              Back to questions
            </Button>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* ── The upload itself ───────────────────────── */}
          <section className="min-w-0 space-y-3">
            <SectionTitle title="Upload a file" />
            <div className="space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <Field
                label="Institution code"
                hint="Required"
                value={institutionCode}
                onChange={(event) => setInstitutionCode(event.target.value)}
                placeholder="UI, UNILAG, OAU…"
                error={
                  institutionCode.trim() && !isInstitutionValid
                    ? "Institution codes are at least two characters."
                    : undefined
                }
              />

              <div className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-4">
                <label
                  htmlFor="bulk-file"
                  className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]"
                >
                  Spreadsheet
                </label>
                <input
                  id="bulk-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setResult(null);
                    setPendingHash(null);
                  }}
                  className={[
                    "mt-2 block w-full text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]",
                    "file:mr-3 file:rounded-[var(--sb-radius-sm)] file:border file:border-[var(--sb-border)]",
                    "file:bg-[var(--sb-surface-2)] file:px-3 file:py-1.5",
                    "file:text-[length:var(--sb-text-xs)] file:font-medium file:text-[var(--sb-text)]",
                    "hover:file:bg-[var(--sb-surface-3)]",
                  ].join(" ")}
                />
                <p className="mt-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  {file
                    ? file.name
                    : "Accepts .csv, .xlsx and .xls"}
                </p>
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={startUpload}
                disabled={isBusy || !file || !isInstitutionValid}
                isLoading={isBusy}
              >
                {!isBusy ? <UploadCloud className="h-4 w-4" /> : null}
                {isHashing
                  ? "Checking for duplicates"
                  : uploadMutation.isPending
                    ? "Importing"
                    : "Start import"}
              </Button>

              {/* Says which requirement is missing, rather than leaving a
                  dead button to be puzzled over. */}
              {!isBusy && (!file || !isInstitutionValid) ? (
                <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  {!isInstitutionValid && !file
                    ? "Enter an institution code and choose a file."
                    : !isInstitutionValid
                      ? "Enter the institution code these questions belong to."
                      : "Choose a spreadsheet to import."}
                </p>
              ) : null}
            </div>

            <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                  Columns the file needs
                </h3>
                <Badge tone="neutral">
                  {BULK_UPLOAD_COLUMNS.length} columns
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {BULK_UPLOAD_COLUMNS.map((column) => (
                  <span
                    key={column}
                    className="sb-mono rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-2 py-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── What happened ───────────────────────────── */}
          <section className="min-w-0 space-y-3">
            <SectionTitle
              title="Result"
              action={
                result ? (
                  <Badge tone={result.success ? "success" : "danger"} dot>
                    {result.success ? "Imported" : "Had errors"}
                  </Badge>
                ) : null
              }
            />

            {result ? (
              <div className="space-y-4">
                <StatGrid className="lg:grid-cols-3">
                  <StatCard
                    label="Rows read"
                    value={formatInteger(result.totalRows)}
                  />
                  <StatCard
                    label="Questions created"
                    value={formatInteger(result.successCount)}
                    status={result.successCount ? "success" : undefined}
                  />
                  <StatCard
                    label="Rows rejected"
                    value={formatInteger(result.errorCount)}
                    status={result.errorCount ? "danger" : undefined}
                  />
                </StatGrid>

                {result.errors.length ? (
                  <div className="space-y-2">
                    <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                      Rows that were rejected
                    </h3>
                    <DataTable
                      caption="Rows rejected during import"
                      items={result.errors}
                      columns={errorColumns}
                      getKey={(error) =>
                        `${error.row}-${error.field}-${error.message}`
                      }
                      emptyTitle="No row errors"
                    />
                  </div>
                ) : null}

                {result.createdIds.length ? (
                  <div className="space-y-2">
                    <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                      Open what was created
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.createdIds.slice(0, 12).map((id) => (
                        <Button
                          key={id}
                          asChild
                          href={`/questions/${id}`}
                          variant="secondary"
                          size="sm"
                        >
                          #{id}
                        </Button>
                      ))}
                      {result.createdIds.length > 12 ? (
                        <span className="self-center text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          and {result.createdIds.length - 12} more
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border)] px-4 py-8 text-center text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
                Nothing imported yet in this session. The result will appear
                here.
              </p>
            )}
          </section>
        </div>

        {/* ── History ───────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            title="Recent imports"
            description="Every bulk upload, most recent first."
            action={
              historyQuery.data ? (
                <Badge tone="neutral">
                  {formatInteger(historyQuery.data.total)} total
                </Badge>
              ) : null
            }
          />
          <DataTable
            caption="Bulk upload history"
            items={historyQuery.data?.batches ?? []}
            columns={historyColumns}
            getKey={(batch) => batch.id}
            isLoading={historyQuery.isLoading}
            error={historyQuery.isError ? historyQuery.error : undefined}
            onRetry={() => historyQuery.refetch()}
            emptyIcon={<History className="h-4 w-4" />}
            emptyTitle="No imports yet"
            emptyDescription="Files you upload will be listed here with their results."
          />
        </section>
      </div>
    </>
  );
}
