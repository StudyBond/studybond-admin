"use client";

import Link from "next/link";
import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { questionsApi } from "@/lib/api/questions";
import { BULK_UPLOAD_COLUMNS } from "@/lib/utils/questions";
import { formatInteger } from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BulkUploadPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [institutionCode, setInstitutionCode] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof questionsApi.bulkUpload>> | null>(null);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error("Choose a CSV or Excel file first.");
      }

      return questionsApi.bulkUpload(file, institutionCode.trim() || undefined);
    },
    onSuccess: async (payload) => {
      setResult(payload);
      if (payload.success) {
        toast.success(`Uploaded ${payload.successCount} questions`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "analytics", "overview"] }),
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

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Questions"
        title="Bulk upload"
        description="Import many questions from CSV or Excel and review validation feedback before using the new records."
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Surface glow="cyan" className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
              <UploadCloud className="h-4 w-4" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Upload file</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Accepted formats are `.csv`, `.xlsx`, and `.xls`. The backend validates every row and rejects malformed imports with row-level errors.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                Institution code
              </span>
              <input
                value={institutionCode}
                onChange={(event) => setInstitutionCode(event.target.value)}
                placeholder="Institution code..."
                className="w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40"
              />
            </label>

            <label className="block rounded-2xl border border-dashed border-white/10 bg-black/10 p-5">
              <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <FileUp className="h-4 w-4 text-[color:var(--accent-cyan)]" />
                Select spreadsheet
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-[color:var(--muted-foreground)] file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--background)] hover:file:opacity-90"
              />
              <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
                {file ? `${file.name} selected` : "No file selected yet"}
              </p>
            </label>

            <button
              type="button"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !file}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Start bulk upload
                </>
              )}
            </button>
          </div>
        </Surface>

        <div className="grid gap-6">
          <Surface className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                  Expected columns
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Spreadsheet schema</h2>
              </div>
              <StatusBadge tone="amber">{BULK_UPLOAD_COLUMNS.length} columns</StatusBadge>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {BULK_UPLOAD_COLUMNS.map((column: any) => (
                <StatusBadge key={column} tone="slate">{column}</StatusBadge>
              ))}
            </div>
          </Surface>

          <Surface glow="emerald" className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
                  Result
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Latest import summary</h2>
              </div>
              <StatusBadge tone={result?.success ? "emerald" : "slate"}>
                {result ? (result.success ? "success" : "failed") : "idle"}
              </StatusBadge>
            </div>

            {result ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Rows</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatInteger(result.totalRows)}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Created</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatInteger(result.successCount)}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Errors</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatInteger(result.errorCount)}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Created IDs</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatInteger(result.createdIds.length)}</p>
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
                            <td className="px-4 py-3 text-white">{error.row}</td>
                            <td className="px-4 py-3 text-[color:var(--muted-foreground)]">{error.field}</td>
                            <td className="px-4 py-3 text-[color:var(--muted-foreground)]">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {result.createdIds.length ? (
                  <div className="flex flex-wrap gap-2">
                    {result.createdIds.slice(0, 12).map((id: any) => (
                      <Link key={id} href={`/questions/${id}`} className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/14 hover:bg-white/[0.04]">
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
    </section>
  );
}
