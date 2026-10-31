"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChips } from "@/components/ui/toolbar";
import { PicturePanel, pictureStatus } from "@/features/pictures/components/picture-panel";
import {
  useHandwritingSheet,
  usePictureList,
  usePictureSummary,
  useRefreshPictures,
} from "@/features/pictures/hooks/use-pictures";
import { picturesApi } from "@/lib/api/pictures";
import type { PictureTask } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { formatInteger } from "@/lib/utils/format";
import { useMutation } from "@tanstack/react-query";
import { Images, PenLine, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Pictures.
 *
 * Replaces the _diagrams.md files: every picture a question still needs is
 * listed here per subject and year. Team pictures are made in ChatGPT and
 * pasted in; line diagrams are drawn by Claude and checked here. Saving puts
 * the picture straight onto its question, or into its spot in the
 * explanation, with the StudyBond mark added by the server.
 */

type Filter = "all" | "team" | "claude" | "check" | "done";

const FILTERS: { value: Filter; label: string; test: (task: PictureTask) => boolean }[] = [
  { value: "all", label: "All", test: () => true },
  { value: "team", label: "ChatGPT", test: (t) => t.maker === "CHATGPT" && t.status !== "DONE" },
  { value: "claude", label: "Claude to draw", test: (t) => t.maker === "CLAUDE" && t.status === "WAITING" },
  { value: "check", label: "To check", test: (t) => t.status === "READY_TO_CHECK" || t.status === "SENT_BACK" },
  { value: "done", label: "Done", test: (t) => t.status === "DONE" },
];

function HandwritingSheetCard({ url }: { url: string | null }) {
  const refresh = useRefreshPictures();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => picturesApi.setHandwritingSheet(file),
    onSuccess: async () => {
      toast.success("Handwriting sheet saved");
      await refresh();
    },
    onError: (error) =>
      toast.error("Could not save the sheet", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      }),
  });

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary address
        <img src={url} alt="The StudyBond handwriting sheet" className="h-40 w-auto rounded-[var(--sb-radius)] bg-white" />
      ) : null}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">Handwriting sheet</p>
        <p className="max-w-xl text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          One page in the StudyBond tutor&apos;s hand. It is pasted into ChatGPT before every pencil sketch prompt,
          so all the sketches look like the same person wrote them. Save it once here.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} isLoading={upload.isPending}>
          <Upload className="h-3.5 w-3.5" />
          {url ? "Replace the sheet" : "Add the sheet"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default function PicturesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <PicturesContent />
    </Suspense>
  );
}

/** ?task=123 opens that picture, in its subject and year, from content review or a shared link. */
function PicturesContent() {
  const summaryQuery = usePictureSummary();
  const sheetQuery = useHandwritingSheet();
  const [subjectChoice, setSubjectChoice] = useState<string | null>(null);
  const [yearChoice, setYearChoice] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const linkedId = Number.parseInt(useSearchParams().get("task") ?? "", 10);
  const openedLink = useRef<number | null>(null);
  useEffect(() => {
    if (!Number.isFinite(linkedId) || openedLink.current === linkedId) return;
    openedLink.current = linkedId;
    picturesApi.get(linkedId).then(
      (linked) => {
        setSubjectChoice(linked.question.subject);
        setYearChoice(linked.question.year ?? 0);
        setFilter("all");
        setSelectedId(linked.id);
      },
      () => toast.error(`Could not open picture #${linkedId}.`),
    );
  }, [linkedId]);

  const subjects = useMemo(() => summaryQuery.data?.subjects ?? [], [summaryQuery.data]);
  const subject =
    subjects.find((entry) => entry.subject === subjectChoice) ??
    subjects.find((entry) => entry.left > 0) ??
    subjects[0];
  const year =
    subject?.years.find((entry) => entry.year === yearChoice) ??
    subject?.years.find((entry) => entry.left > 0) ??
    subject?.years[subject.years.length - 1];

  const listQuery = usePictureList(subject?.subject ?? null, year?.year ?? null);
  const tasks = useMemo(() => listQuery.data?.tasks ?? [], [listQuery.data]);
  const activeFilter = FILTERS.find((entry) => entry.value === filter) ?? FILTERS[0];
  const visible = tasks.filter(activeFilter.test);

  const selected =
    tasks.find((task) => task.id === selectedId) ??
    visible.find((task) => task.status !== "DONE") ??
    visible[0];
  const position = selected ? tasks.findIndex((task) => task.id === selected.id) : -1;

  function select(task: PictureTask | undefined, scroll = false) {
    if (!task) return;
    setSelectedId(task.id);
    if (scroll && window.matchMedia("(max-width: 1279px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /** After a save, move on to the next picture that still needs work. */
  function goToNextOpen(finished: PictureTask) {
    const start = tasks.findIndex((task) => task.id === finished.id);
    for (let step = 1; step < tasks.length; step += 1) {
      const next = tasks[(start + step) % tasks.length];
      if (next.status !== "DONE" && !(next.maker === "CLAUDE" && next.status === "WAITING")) {
        setSelectedId(next.id);
        return;
      }
    }
    setSelectedId(finished.id);
  }

  const totals = summaryQuery.data?.totals;
  const waitingOnClaude = (totals?.sentBack ?? 0);

  return (
    <div className="sb-enter space-y-5 pb-2">
      <PageHeader
        title="Pictures"
        description={
          totals
            ? `${formatInteger(totals.left)} still needed, ${formatInteger(totals.done)} done. Paste a picture in and it goes straight onto its question.`
            : "Pictures that questions and explanations still need."
        }
        meta={
          totals && (totals.toCheck > 0 || waitingOnClaude > 0) ? (
            <div className="flex flex-wrap gap-1.5">
              {totals.toCheck > 0 ? <Badge tone="info">{totals.toCheck} drawings to check</Badge> : null}
              {waitingOnClaude > 0 ? <Badge tone="warning">{waitingOnClaude} sent back to Claude</Badge> : null}
            </div>
          ) : null
        }
        action={
          <Button type="button" variant="secondary" onClick={() => setSheetOpen((open) => !open)}>
            <PenLine className="h-4 w-4" />
            Handwriting sheet
          </Button>
        }
      />

      {sheetOpen ? <HandwritingSheetCard url={sheetQuery.data?.url ?? null} /> : null}

      {summaryQuery.isError ? (
        <ErrorState title="Could not load the pictures" error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />
      ) : null}

      <div className="space-y-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-3 sm:p-4">
        {summaryQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : subjects.length ? (
          <>
            <div role="tablist" aria-label="Subject" className="flex flex-wrap gap-1.5">
              {subjects.map((entry) => {
                const isActive = entry.subject === subject?.subject;
                return (
                  <button
                    key={entry.subject}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setSubjectChoice(entry.subject);
                      setYearChoice(null);
                      setSelectedId(null);
                    }}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-[var(--sb-radius)] border px-3.5 text-[length:var(--sb-text-base)] font-medium transition-colors duration-[var(--sb-duration-fast)]",
                      isActive
                        ? "border-[var(--sb-border-hover)] bg-[var(--sb-surface-3)] text-[var(--sb-text)]"
                        : "border-transparent text-[var(--sb-text-secondary)] hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)]",
                    )}
                  >
                    {entry.subject}
                    <span className="sb-nums font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      {entry.left} left
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {subject?.years.map((entry) => {
                const isActive = entry.year === year?.year;
                const percent = entry.total ? Math.round((entry.done / entry.total) * 100) : 0;
                return (
                  <button
                    key={entry.year}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setYearChoice(entry.year);
                      setSelectedId(null);
                    }}
                    className={cn(
                      "flex w-[6.5rem] flex-col gap-1.5 rounded-[var(--sb-radius)] border px-3 py-2.5 text-left transition-colors duration-[var(--sb-duration-fast)]",
                      isActive
                        ? "border-[var(--sb-accent)] bg-[var(--sb-accent-soft)]"
                        : "border-[var(--sb-border)] bg-[var(--sb-bg-inset)] hover:border-[var(--sb-border-hover)]",
                    )}
                  >
                    <span className="font-mono text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                      {entry.year || "No year"}
                    </span>
                    <span className="block h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                      <span className="block h-full rounded-full bg-[var(--sb-success)]" style={{ width: `${percent}%` }} />
                    </span>
                    <span
                      className={cn(
                        "text-[length:var(--sb-text-2xs)]",
                        entry.left === 0 ? "text-[var(--sb-success)]" : "text-[var(--sb-text-secondary)]",
                      )}
                    >
                      {entry.left === 0 ? "All done" : `${entry.left} left`}
                      {entry.toCheck ? ` · ${entry.toCheck} to check` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Images className="h-4 w-4" />}
            title="No pictures loaded yet"
            description="Pictures appear here once the question files' picture notes are imported."
          />
        )}
      </div>

      {subject && year ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section aria-label={`Pictures for ${subject.subject} ${year.year}`} className="min-w-0 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]">
                {subject.subject} {year.year}
              </h2>
              <span className="sb-nums text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                {tasks.length} {tasks.length === 1 ? "picture" : "pictures"}
              </span>
            </div>
            <FilterChips
              options={FILTERS.map((entry) => ({
                value: entry.value,
                label: `${entry.label} · ${tasks.filter(entry.test).length}`,
              }))}
              value={filter}
              onChange={(value) => {
                setFilter(value as Filter);
                setSelectedId(null);
              }}
            />
            <div className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
              {listQuery.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : listQuery.isError ? (
                <ErrorState title="Could not load this year" error={listQuery.error} onRetry={() => listQuery.refetch()} />
              ) : visible.length ? (
                <ul className="divide-y divide-[var(--sb-border)]">
                  {visible.map((task) => {
                    const status = pictureStatus(task);
                    const isSelected = task.id === selected?.id;
                    return (
                      <li key={task.id} className="relative">
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => select(task, true)}
                          className={cn(
                            "flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors duration-[var(--sb-duration-fast)]",
                            isSelected ? "bg-[var(--sb-accent-soft)]" : "hover:bg-[var(--sb-surface-2)]",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute inset-y-0 left-0 w-[2px] bg-[var(--sb-accent)] transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="w-16 shrink-0 pt-0.5 font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            {task.label}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[length:var(--sb-text-sm)] font-medium leading-snug text-[var(--sb-text)]">
                              {task.title}
                            </span>
                            <span className="mt-0.5 block text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                              {task.kind === "EXPLANATION" ? "Explanation sketch" : "Question picture"} ·{" "}
                              {task.maker === "CLAUDE" ? "Claude" : "ChatGPT"}
                            </span>
                          </span>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={<Images className="h-4 w-4" />}
                  title="Nothing here"
                  description="No pictures in this year match this filter."
                />
              )}
            </div>
          </section>

          <div ref={panelRef} className="min-w-0 scroll-mt-20">
            {selected ? (
              <PicturePanel
                key={selected.id}
                task={selected}
                position={position + 1}
                count={tasks.length}
                onPrev={() => select(tasks[(position - 1 + tasks.length) % tasks.length])}
                onNext={() => select(tasks[(position + 1) % tasks.length])}
                onFinished={goToNextOpen}
                sheetUrl={sheetQuery.data?.url ?? null}
              />
            ) : listQuery.isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
