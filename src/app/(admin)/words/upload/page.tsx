"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterChips } from "@/components/ui/toolbar";
import { useRefreshWords } from "@/features/words/hooks/use-words";
import { KIND_LABEL, chunk, parseCardFile } from "@/features/words/lib/word-rules";
import { adminWordsApi, type UploadCard, type UploadResultRow } from "@/lib/api/admin-words";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, FileJson, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Word of the day: upload cards from the content pipeline.
 *
 * The file is checked first with a test run that writes nothing: every
 * card's questions are found on the site (board, subject, year and a piece
 * of the text), and the page lists what would be added, what would be
 * updated and what has a problem. Only "Save" writes, and it sends just
 * the cards that passed. Cards go in small groups so no single request
 * runs long.
 */

const GROUP_SIZE = 10;

type Row = UploadResultRow & { card: UploadCard };
type Filter = "all" | "CREATE" | "UPDATE" | "ERROR";

const ACTION: Record<UploadResultRow["action"], { label: string; tone: BadgeTone }> = {
  CREATE: { label: "New", tone: "info" },
  UPDATE: { label: "Update", tone: "neutral" },
  ERROR: { label: "Problem", tone: "danger" },
};

async function runInGroups(
  cards: UploadCard[],
  dryRun: boolean,
  onProgress: (done: number) => void,
): Promise<UploadResultRow[]> {
  const results: UploadResultRow[] = [];
  for (const group of chunk(cards, GROUP_SIZE)) {
    const reply = await adminWordsApi.upload(group, dryRun);
    results.push(...reply.results);
    onProgress(results.length);
  }
  return results;
}

export default function WordUploadPage() {
  const refresh = useRefreshWords();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileProblems, setFileProblems] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [progress, setProgress] = useState<{ step: "check" | "save"; done: number; total: number } | null>(null);
  const [saved, setSaved] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [isDragging, setIsDragging] = useState(false);

  function reset() {
    setFileName(null);
    setFileProblems([]);
    setRows(null);
    setSaved(null);
    setFilter("all");
  }

  async function read(file: File) {
    reset();
    setFileName(file.name);
    const parsed = parseCardFile(await file.text());
    if (parsed.problems.length > 0) {
      setFileProblems(parsed.problems);
      return;
    }
    setProgress({ step: "check", done: 0, total: parsed.cards.length });
    try {
      const results = await runInGroups(parsed.cards, true, (done) =>
        setProgress({ step: "check", done, total: parsed.cards.length }),
      );
      setRows(results.map((result, index) => ({ ...result, card: parsed.cards[index] })));
    } catch (error) {
      toast.error("Could not check the file", { description: <ApiErrorMessage error={error} fallback="Please try again." /> });
    } finally {
      setProgress(null);
    }
  }

  async function save() {
    if (!rows) return;
    const passing = rows.filter((row) => row.action !== "ERROR");
    setProgress({ step: "save", done: 0, total: passing.length });
    try {
      const results = await runInGroups(
        passing.map((row) => row.card),
        false,
        (done) => setProgress({ step: "save", done, total: passing.length }),
      );
      const savedRows = results.map((result, index) => ({ ...result, card: passing[index].card }));
      setSaved(savedRows);
      setFilter("all");
      const failed = savedRows.filter((row) => row.action === "ERROR").length;
      if (failed) toast.warning(`${savedRows.length - failed} saved, ${failed} refused`);
      else toast.success(`${savedRows.length} cards saved`);
    } catch (error) {
      toast.error("The save stopped part way", {
        description: (
          <span>
            <ApiErrorMessage error={error} fallback="Please try again." /> Cards in the groups before the error were saved.
            Upload the same file again: saved cards show as updates, so nothing is added twice.
          </span>
        ),
      });
    } finally {
      setProgress(null);
      await refresh();
    }
  }

  const shown = saved ?? rows;
  const count = (action: UploadResultRow["action"]) => (shown ?? []).filter((row) => row.action === action).length;
  const visible = (shown ?? []).filter((row) => filter === "all" || row.action === filter);
  const passing = (rows ?? []).filter((row) => row.action !== "ERROR").length;

  return (
    <div className="sb-enter space-y-5 pb-2">
      <PageHeader
        title="Upload cards"
        description="Add or update word cards from a content pipeline file. The file is checked first and nothing is saved until you press Save."
        action={
          <Button asChild variant="secondary" href="/words">
            Back to the cards
          </Button>
        }
      />

      {/* File */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !progress) void read(file);
        }}
        className={cn(
          "flex flex-col items-start gap-3 rounded-[var(--sb-radius-lg)] border border-dashed p-4 sm:flex-row sm:items-center sm:p-5",
          isDragging ? "border-[var(--sb-accent)] bg-[var(--sb-accent-soft)]" : "border-[var(--sb-border-hover)] bg-[var(--sb-surface-1)]",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-tertiary)]">
          <FileJson className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">
            {fileName ?? "Choose a cards file"}
          </p>
          <p className="mt-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            {progress
              ? progress.step === "check"
                ? `Checking ${progress.done} of ${progress.total} cards...`
                : `Saving ${progress.done} of ${progress.total} cards...`
              : "A .json file from content-pipeline/output/WordCards. Drop it here or choose it."}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={Boolean(progress)}>
          <Upload className="h-4 w-4" />
          {fileName ? "Choose another file" : "Choose file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void read(file);
            event.target.value = "";
          }}
        />
      </div>

      {fileProblems.length > 0 ? (
        <div role="alert" className="flex gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-danger)]" />
          <div className="min-w-0 text-[length:var(--sb-text-sm)]">
            <p className="font-medium text-[var(--sb-text)]">This file can&apos;t be checked yet</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[var(--sb-text-secondary)]">
              {fileProblems.slice(0, 20).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {fileProblems.length > 20 ? <li>And {fileProblems.length - 20} more.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}

      {shown ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">
                {saved ? "Saved" : "Test run: nothing saved yet"}
              </p>
              <p className="mt-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                {saved
                  ? `${count("CREATE")} added as drafts, ${count("UPDATE")} updated${count("ERROR") ? `, ${count("ERROR")} refused` : ""}. Updated cards keep their status.`
                  : `${count("CREATE")} new, ${count("UPDATE")} already on the site and would be updated${count("ERROR") ? `, ${count("ERROR")} with a problem` : ""}. New cards start as drafts.`}
              </p>
              {!saved && count("ERROR") > 0 && passing > 0 ? (
                <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-warning)]">
                  Cards with a problem are left out. Fix them in the file and upload it again.
                </p>
              ) : null}
            </div>
            {saved ? (
              <Button asChild href="/words">
                Go to the cards
              </Button>
            ) : passing > 0 ? (
              <ConfirmButton
                variant="primary"
                confirmLabel={`Yes, save ${passing}`}
                onConfirm={() => void save()}
                isLoading={progress?.step === "save"}
                disabled={Boolean(progress)}
              >
                Save {passing} {passing === 1 ? "card" : "cards"}
              </ConfirmButton>
            ) : null}
          </div>

          <FilterChips
            options={[
              { value: "all", label: `All · ${shown.length}` },
              { value: "CREATE", label: `New · ${count("CREATE")}` },
              { value: "UPDATE", label: `Update · ${count("UPDATE")}` },
              { value: "ERROR", label: `${saved ? "Refused" : "Problem"} · ${count("ERROR")}` },
            ]}
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
          />

          <div className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
            <ul className="divide-y divide-[var(--sb-border)]">
              {visible.map((row) => (
                <li key={`${row.slug}-${row.card.headword}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.cardId ? (
                        <Link href={`/words?card=${row.cardId}`} className="font-medium text-[var(--sb-text)] hover:underline">
                          {row.headword}
                        </Link>
                      ) : (
                        <span className="font-medium text-[var(--sb-text)]">{row.headword}</span>
                      )}
                      <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {KIND_LABEL[row.card.kind]} ·{" "}
                        {row.card.questionMatches.map((match) => match.year).join(", ")}
                      </span>
                    </div>
                    {row.errors.length ? (
                      <ul className="mt-1 space-y-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-danger)]">
                        {row.errors.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-0.5 truncate text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">{row.card.meaning}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {row.questionIds.map((id) => (
                      <Link
                        key={id}
                        href={`/questions/${id}`}
                        className="sb-nums font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)] hover:text-[var(--sb-accent-text)]"
                      >
                        #{id}
                      </Link>
                    ))}
                    <Badge tone={ACTION[row.action].tone}>{saved && row.action === "ERROR" ? "Refused" : ACTION[row.action].label}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
