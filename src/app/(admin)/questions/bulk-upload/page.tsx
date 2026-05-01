"use client";

import Link from "next/link";
import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { questionsApi, computeFileHash } from "@/lib/api/questions";
import { BULK_UPLOAD_COLUMNS } from "@/lib/utils/questions";
import { formatInteger, formatDateTime } from "@/lib/utils/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileUp,
  LoaderCircle,
  UploadCloud,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { BulkUploadBatch } from "@/lib/api/types";

// ── Duplicate Confirmation Dialog ─────────────────────

function DuplicateDialog({
  batch,
  onConfirm,
  onCancel,
}: {
  batch: BulkUploadBatch;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[color:var(--panel)] p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">
              Duplicate file detected
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              A file with identical content was already uploaded:
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-4 text-sm">
          <div className="grid grid-cols-2 gap-y-2">
            <span className="text-[color:var(--muted-foreground)]">File</span>
            <span className="truncate text-white">{batch.fileName}</span>
            <span className="text-[color:var(--muted-foreground)]">
              Uploaded
            </span>
            <span className="text-white">{formatDateTime(batch.createdAt)}</span>
            <span className="text-[color:var(--muted-foreground)]">
              Questions
            </span>
            <span className="text-white">
              {formatInteger(batch.questionCount)}
            </span>
            <span className="text-[color:var(--muted-foreground)]">By</span>
            <span className="text-white">{batch.uploaderName}</span>
          </div>
        </div>

        <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">
          Are you sure you want to upload this file again? This will create
          duplicate questions.
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            Upload anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────

export default function BulkUploadPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [institutionCode, setInstitutionCode] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof questionsApi.bulkUpload>> | null>(null);
  const [duplicateBatch, setDuplicateBatch] = useState<BulkUploadBatch | null>(null);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  const institutionCodeTrimmed = institutionCode.trim();
  const isInstitutionValid = institutionCodeTrimmed.length >= 2;

  // ── Upload History Query ────────────────────────────

  const historyQuery = useQuery({
    queryKey: ["admin", "bulk-upload-history"],
    queryFn: () => questionsApi.bulkUploadHistory(undefined, 20),
    refetchOnWindowFocus: false,
  });

  // ── Upload Mutation ─────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async (opts: { hash: string }) => {
      if (!file) throw new Error("Choose a CSV or Excel file first.");
      return questionsApi.bulkUpload(file, institutionCodeTrimmed || undefined, opts.hash);
    },
    onSuccess: async (payload: any) => {
      setResult(payload);
      if (payload.success) {
        toast.success(`Uploaded ${payload.successCount} questions`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "analytics", "overview"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "bulk-upload-history"] }),
        ]);
      } else {
        toast.error("Bulk upload finished with validation errors");
      }
    },
    onError: (error) => {
      toast.error("Bulk upload failed", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  // ── Upload Flow (hash → duplicate check → upload) ──

  const startUpload = useCallback(async () => {
    if (!file || !isInstitutionValid) return;

    setIsHashing(true);
    try {
      const hash = await computeFileHash(file);
      setPendingHash(hash);

      // Check for duplicates
      try {
        const check = await questionsApi.checkDuplicate(hash);
        if (check.isDuplicate && check.existingBatch) {
          setIsHashing(false);
          setDuplicateBatch(check.existingBatch);
          return; // Dialog will handle the rest
        }
      } catch {
        // If duplicate check fails, proceed anyway
      }

      setIsHashing(false);
      uploadMutation.mutate({ hash });
    } catch {
      setIsHashing(false);
      toast.error("Failed to process file");
    }
  }, [file, isInstitutionValid, institutionCodeTrimmed, uploadMutation]);

  const confirmDuplicateUpload = useCallback(() => {
    setDuplicateBatch(null);
    if (pendingHash) {
      uploadMutation.mutate({ hash: pendingHash });
    }
  }, [pendingHash, uploadMutation]);

  const cancelDuplicateUpload = useCallback(() => {
    setDuplicateBatch(null);
    setPendingHash(null);
  }, []);

  const isBusy = isHashing || uploadMutation.isPending;

  return (
    <>
      {duplicateBatch && (
        <DuplicateDialog
          batch={duplicateBatch}
          onConfirm={confirmDuplicateUpload}
          onCancel={cancelDuplicateUpload}
        />
      )}

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Questions"
          title="Bulk upload"
          description="Import many questions from CSV or Excel, track upload history, and detect duplicate files before re-importing."
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          {/* ── Upload Form ─────────────────────────── */}
          <Surface glow="cyan" className="p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
                <UploadCloud className="h-4 w-4" />
              </span>
              <div>
                <p className="text-base font-semibold text-white">Upload file</p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Accepted formats are `.csv`, `.xlsx`, and `.xls`. The backend
                  validates every row and rejects malformed imports with
                  row-level errors.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Institution Code — REQUIRED */}
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  Institution code
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-normal text-rose-400">
                    Required
                  </span>
                </span>
                <input
                  value={institutionCode}
                  onChange={(event) => setInstitutionCode(event.target.value)}
                  placeholder="e.g. UI, UNILAG, OAU..."
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 ${
                    institutionCode.trim() && !isInstitutionValid
                      ? "border-rose-400/40 bg-rose-500/5 focus:border-rose-400/60"
                      : "border-white/8 bg-black/10 focus:border-[color:var(--accent-cyan)]/40"
                  }`}
                />
                {institutionCode.trim() && !isInstitutionValid && (
                  <p className="mt-1.5 text-xs text-rose-400">
                    Enter a valid institution code (at least 2 characters)
                  </p>
                )}
              </label>

              {/* File Picker */}
              <label className="block rounded-2xl border border-dashed border-white/10 bg-black/10 p-5">
                <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <FileUp className="h-4 w-4 text-[color:var(--accent-cyan)]" />
                  Select spreadsheet
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setResult(null);
                    setPendingHash(null);
                  }}
                  className="block w-full text-sm text-[color:var(--muted-foreground)] file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--background)] hover:file:opacity-90"
                />
                <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
                  {file ? `${file.name} selected` : "No file selected yet"}
                </p>
              </label>

              {/* Upload Button */}
              <button
                type="button"
                onClick={startUpload}
                disabled={isBusy || !file || !isInstitutionValid}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {isHashing ? "Checking file..." : "Uploading..."}
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Start bulk upload
                  </>
                )}
              </button>

              {!isInstitutionValid && file && (
                <p className="text-center text-xs text-[color:var(--muted-foreground)]">
                  Enter the institution code above to enable upload
                </p>
              )}
            </div>
          </Surface>

          {/* ── Right Column ────────────────────────── */}
          <div className="grid gap-6">
            {/* Schema Reference */}
            <Surface className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                    Expected columns
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Spreadsheet schema
                  </h2>
                </div>
                <StatusBadge tone="amber">
                  {BULK_UPLOAD_COLUMNS.length} columns
                </StatusBadge>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {BULK_UPLOAD_COLUMNS.map((column: any) => (
                  <StatusBadge key={column} tone="slate">
                    {column}
                  </StatusBadge>
                ))}
              </div>
            </Surface>

            {/* Upload Result */}
            <Surface glow="emerald" className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
                    Result
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Latest import summary
                  </h2>
                </div>
                <StatusBadge tone={result?.success ? "emerald" : "slate"}>
                  {result ? (result.success ? "success" : "failed") : "idle"}
                </StatusBadge>
              </div>

              {result ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        Rows
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatInteger(result.totalRows)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        Created
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatInteger(result.successCount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        Errors
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatInteger(result.errorCount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        Created IDs
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatInteger(result.createdIds.length)}
                      </p>
                    </div>
                  </div>

                  {result.errors.length ? (
                    <div className="overflow-x-auto rounded-xl border border-white/8">
                      <table className="min-w-[560px] w-full divide-y divide-white/8 text-sm">
                        <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                          <tr>
                            <th className="px-4 py-3">Row</th>
                            <th className="px-4 py-3">Field</th>
                            <th className="px-4 py-3">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/8 bg-black/10">
                          {result.errors.map((error: any, index: number) => (
                            <tr key={`${error.row}-${error.field}-${index}`}>
                              <td className="px-4 py-3 text-white">
                                {error.row}
                              </td>
                              <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                                {error.field}
                              </td>
                              <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                                {error.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {result.createdIds.length ? (
                    <div className="flex flex-wrap gap-2">
                      {result.createdIds.slice(0, 12).map((id: any) => (
                        <Link
                          key={id}
                          href={`/questions/${id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/14 hover:bg-white/[0.04]"
                        >
                          #{id}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-sm text-[color:var(--muted-foreground)]">
                  No upload has been run yet in this session.
                </p>
              )}
            </Surface>
          </div>
        </div>

        {/* ── Upload History ──────────────────────────── */}
        <Surface className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-amber)]">
                <History className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                  Upload history
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Recent bulk uploads
                </h2>
              </div>
            </div>
            {historyQuery.data && (
              <StatusBadge tone="amber">
                {historyQuery.data.total} total
              </StatusBadge>
            )}
          </div>

          <div className="mt-5">
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <LoaderCircle className="h-5 w-5 animate-spin text-[color:var(--muted-foreground)]" />
              </div>
            ) : historyQuery.data?.batches.length ? (
              <div className="overflow-x-auto rounded-xl border border-white/8">
                <table className="min-w-[700px] w-full divide-y divide-white/8 text-sm">
                  <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-3">File</th>
                      <th className="px-4 py-3">Institution</th>
                      <th className="px-4 py-3">Questions</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Uploaded by</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 bg-black/10">
                    {historyQuery.data.batches.map((batch) => (
                      <tr
                        key={batch.id}
                        className="transition hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted-foreground)]" />
                            <span className="max-w-[200px] truncate text-white">
                              {batch.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone="cyan">
                            {batch.institutionCode}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-white">
                          {formatInteger(batch.successCount)}/{formatInteger(batch.totalRows)}
                        </td>
                        <td className="px-4 py-3">
                          {batch.status === "COMPLETED" ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-400">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                          {batch.uploaderName}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                          {formatDateTime(batch.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                No upload history yet. Your bulk uploads will appear here.
              </p>
            )}
          </div>
        </Surface>
      </section>
    </>
  );
}
