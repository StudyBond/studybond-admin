"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MathMarkdown } from "@/components/ui/math-markdown";
import { DrawingCheckActions } from "@/features/pictures/components/drawing-check";
import { useRefreshPictures } from "@/features/pictures/hooks/use-pictures";
import { reviewHref, reviewTargetOf } from "@/features/pictures/lib/picture-rules";
import { picturesApi } from "@/lib/api/pictures";
import type { PictureMaker, PictureStrength, PictureTask } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageIcon,
  PenLine,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PasteZone } from "./paste-zone";
import { StrengthPicker, WatermarkPreview } from "./watermark-preview";

export function pictureStatus(task: Pick<PictureTask, "status" | "maker">): { label: string; tone: BadgeTone } {
  switch (task.status) {
    case "DONE":
      return { label: "Done", tone: "success" };
    case "READY_TO_CHECK":
      return { label: "Ready to check", tone: "info" };
    case "SENT_BACK":
      return { label: "Sent back", tone: "warning" };
    default:
      return task.maker === "CLAUDE"
        ? { label: "Claude to draw", tone: "neutral" }
        : { label: "Waiting", tone: "neutral" };
  }
}

function Section({ title, children, step }: { title: string; children: React.ReactNode; step?: number }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2.5 text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">
        {step ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sb-border-hover)] bg-[var(--sb-surface-3)] font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
            {step}
          </span>
        ) : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function NoteBox({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
      <p className="text-[length:var(--sb-text-sm)] font-semibold text-[var(--sb-text)]">{title}</p>
      <MathMarkdown content={content} className="mt-1 text-[length:var(--sb-text-sm)]" />
    </div>
  );
}

/** The question as a student sees it, with whichever picture is relevant. */
function QuestionCard({ task, picture, strength }: { task: PictureTask; picture: string | null; strength?: PictureStrength }) {
  const { question } = task;
  return (
    <div className="space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-4 sm:p-5">
      <MathMarkdown content={question.questionText} variant="question" />
      {picture ? (
        <div className="flex justify-center">
          {strength ? (
            <WatermarkPreview src={picture} strength={strength} alt={task.title} className="w-full max-w-[34rem]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary address
            <img src={picture} alt={task.title} className="block h-auto w-full max-w-[34rem] rounded-[var(--sb-radius)] bg-white" />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border-active)] py-10 text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          No picture yet
        </div>
      )}
      {question.options.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => {
            const isKey = option.letter === question.correctAnswer;
            return (
              <div
                key={option.letter}
                className={cn(
                  "flex items-start gap-2.5 rounded-[var(--sb-radius)] border px-3 py-2",
                  isKey
                    ? "border-[var(--sb-success-ring)] bg-[var(--sb-success-soft)]"
                    : "border-[var(--sb-border)]",
                )}
              >
                <span className="pt-0.5 font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  {option.letter}
                </span>
                <MathMarkdown content={option.text} variant="option" className="min-w-0 flex-1" />
                {isKey ? <Badge tone="success">Key</Badge> : null}
              </div>
            );
          })}
        </div>
      ) : question.sharedWith.length ? (
        <div className="space-y-1.5">
          <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            This picture shows above these questions:
          </p>
          {question.sharedWith.map((child) => (
            <MathMarkdown key={child.id} content={child.questionText} className="text-[length:var(--sb-text-sm)]" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Where a sketch goes in the explanation, with the paragraphs around it. */
function SpotCard({ task }: { task: PictureTask }) {
  const spot = task.spot;
  if (!spot?.found) {
    return (
      <div className="flex items-start gap-2.5 rounded-[var(--sb-radius)] border border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] p-3 text-[length:var(--sb-text-sm)] text-[var(--sb-warning)]">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          The explanation has changed since the notes were written, so the spot for this sketch can&apos;t be found.
          Add the sketch from the{" "}
          <Link href={`/questions/${task.question.id}`} className="underline underline-offset-2">
            question page
          </Link>{" "}
          instead.
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-4 sm:p-5">
      {spot.before.map((paragraph, index) => (
        <MathMarkdown key={`b${index}`} content={paragraph} variant="explanation" />
      ))}
      {task.status === "DONE" && task.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary address
        <img src={task.imageUrl} alt={task.altText ?? task.title} className="mx-auto block h-auto w-full max-w-[22rem] rounded-[var(--sb-radius)] bg-white" />
      ) : (
        <div className="flex items-center gap-2.5 rounded-[var(--sb-radius)] border-[1.5px] border-dashed border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] px-4 py-3 text-[length:var(--sb-text-sm)] text-[var(--sb-accent-text)]">
          <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          The sketch goes here.
        </div>
      )}
      {spot.after.map((paragraph, index) => (
        <MathMarkdown key={`a${index}`} content={paragraph} variant="explanation" />
      ))}
    </div>
  );
}

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Could not copy the ${what.toLowerCase()}`, { description: "Select the text and copy it by hand." });
  }
}

/** Copies the handwriting sheet as a picture, so it can be pasted straight into ChatGPT. */
async function copySheet(url: string) {
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("no picture");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast.success("Handwriting sheet copied", { description: "Paste it into a new ChatGPT chat first." });
  } catch {
    window.open(url, "_blank", "noopener");
    toast.error("Could not copy the sheet", { description: "It opened in a new tab. Right-click it and choose Copy image." });
  }
}

function chatGptLink(prompt: string | null) {
  return prompt ? `https://chatgpt.com/?q=${encodeURIComponent(prompt)}` : "https://chatgpt.com/";
}

export function PicturePanel({
  task,
  position,
  count,
  onPrev,
  onNext,
  onFinished,
  sheetUrl,
}: {
  task: PictureTask;
  position: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  onFinished: (task: PictureTask) => void;
  sheetUrl: string | null;
}) {
  const refresh = useRefreshPictures();
  const router = useRouter();
  const [strength, setStrength] = useState<PictureStrength>("normal");
  const [replaceOpen, setReplaceOpen] = useState(false);

  const status = pictureStatus(task);
  const isSketch = task.kind === "EXPLANATION";
  const where = isSketch ? "Pencil sketch in the explanation" : task.question.sharedWith.length ? "Shared question picture" : "Question picture";
  const madeBy = task.maker === "CLAUDE" ? "Claude draws it in code" : "made in ChatGPT";
  const isLive = task.question.reviewStatus === "PUBLISHED";
  // A shared row has no answer of its own, so its questions are what get reviewed.
  const isShared = task.question.sharedWith.length > 0;

  const onError = (title: string) => (error: unknown) =>
    toast.error(title, { description: <ApiErrorMessage error={error} fallback="Please try again." /> });

  /* Once the picture is on, the question is often ready to publish, so the
     saved message offers to go straight there. */
  const reviewAction = (updated: PictureTask) =>
    updated.question.reviewStatus !== "PUBLISHED" || isShared
      ? { label: "Review it now", onClick: () => router.push(reviewHref(reviewTargetOf(updated))) }
      : undefined;

  const save = useMutation({
    mutationFn: ({ file, strength: chosen }: { file: File; strength: PictureStrength }) =>
      picturesApi.saveImage(task.id, file, chosen),
    onSuccess: async (updated) => {
      setReplaceOpen(false);
      toast.success(
        isSketch ? `${task.label} sketch saved into the explanation` : `${task.label} picture saved to the question`,
        { action: reviewAction(updated) },
      );
      await refresh();
      onFinished(updated);
    },
  });

  const reopen = useMutation({
    mutationFn: () => picturesApi.reopen(task.id),
    onSuccess: () => refresh(),
    onError: onError("Could not undo"),
  });

  const setMaker = useMutation({
    mutationFn: (maker: PictureMaker) => picturesApi.setMaker(task.id, maker),
    onSuccess: async (_updated, maker) => {
      toast.success(maker === "CLAUDE" ? "Claude will draw this one" : "Moved to ChatGPT");
      await refresh();
    },
    onError: onError("Could not change who makes it"),
  });

  const teamChecks = task.teamNote ? <NoteBox title="Before you save, check" content={task.teamNote} /> : null;
  const showChatGpt = task.maker === "CHATGPT" && task.status !== "DONE";

  return (
    <div className="space-y-6 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              {task.question.subject} {task.question.year} · {task.label}
            </span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <h2 className="mt-1.5 text-[length:var(--sb-text-xl)] font-semibold tracking-tight text-[var(--sb-text)]">
            {task.title}
          </h2>
          <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            {where} · {task.question.topic ?? "No topic"} · {madeBy}
          </p>
        </div>
        {/* Live questions are not in content review, so they open in the editor. */}
        <Button
          asChild
          href={isLive && !isShared ? `/questions/${task.question.id}` : reviewHref(reviewTargetOf(task))}
          variant="ghost"
          size="sm"
        >
          {isLive && !isShared ? "Open question" : "Open in Content review"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-1">
          <Button type="button" variant="secondary" size="icon" aria-label="Previous picture" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="sb-nums px-2 font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {position} of {count}
          </span>
          <Button type="button" variant="secondary" size="icon" aria-label="Next picture" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {isLive && !isSketch && task.status !== "DONE" ? (
        <div className="flex items-start gap-2.5 rounded-[var(--sb-radius)] border border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] p-3 text-[length:var(--sb-text-sm)] text-[var(--sb-warning)]">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>This question is already live without its picture, so students see it like that now. Do this one first.</span>
        </div>
      ) : null}

      {isSketch ? (
        <>
          <NoteBox title="The question" content={task.question.questionText} />
          <Section title="Where it goes in the explanation" step={showChatGpt ? 1 : undefined}>
            <SpotCard task={task} />
          </Section>
        </>
      ) : (
        <Section title="How students will see it">
          <QuestionCard
            task={task}
            picture={task.status === "READY_TO_CHECK" || task.status === "SENT_BACK" ? task.draftImageUrl : task.question.imageUrl}
            strength={task.status === "READY_TO_CHECK" ? strength : undefined}
          />
        </Section>
      )}

      {task.status === "DONE" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-success-ring)] bg-[var(--sb-success-soft)] px-4 py-3 text-[length:var(--sb-text-sm)] text-[var(--sb-success)]">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              Done. {isSketch ? "The sketch is in the explanation." : "This picture is on the question."}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setReplaceOpen((open) => !open)}>
              {replaceOpen ? "Keep this picture" : "Replace picture"}
            </Button>
            <Button asChild href={`/questions/${task.question.id}`} variant="ghost" size="sm">
              Open question
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {replaceOpen ? (
            <PasteZone
              saveLabel="Replace the picture"
              isSaving={save.isPending}
              onSave={(file, chosen) => save.mutateAsync({ file, strength: chosen })}
            />
          ) : null}
        </div>
      ) : null}

      {task.maker === "CLAUDE" && task.status === "WAITING" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-4 py-3 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            <PenLine className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              Claude will draw this one in code. It shows up here to check once it&apos;s drawn.
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMaker.mutate("CHATGPT")} isLoading={setMaker.isPending}>
              Make it in ChatGPT instead
            </Button>
          </div>
          <NoteBox title="What the picture must show" content={task.whatToShow} />
        </div>
      ) : null}

      {task.status === "READY_TO_CHECK" || task.status === "SENT_BACK" ? (
        <div className="space-y-5">
          {task.status === "READY_TO_CHECK" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">StudyBond mark</span>
              <StrengthPicker value={strength} onChange={setStrength} />
              <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                The server adds it when the picture is saved.
              </span>
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-2">
            <NoteBox title="Look for these" content={task.whatToShow} />
            <NoteBox title="Note from the question file" content={task.teamNote} />
          </div>

          {task.status === "SENT_BACK" ? (
            <div className="flex flex-wrap items-start gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] px-4 py-3 text-[length:var(--sb-text-sm)] text-[var(--sb-warning)]">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                Sent back. Claude sees this note the next time someone asks it to work on pictures:
                <span className="mt-1 block text-[var(--sb-text)]">“{task.sentBackNote}”</span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => reopen.mutate()} isLoading={reopen.isPending}>
                Undo
              </Button>
            </div>
          ) : (
            <DrawingCheckActions
              task={task}
              strength={strength}
              onApproved={onFinished}
              approvedAction={reviewAction}
              extra={
                <Button type="button" variant="ghost" size="sm" onClick={() => setMaker.mutate("CHATGPT")} isLoading={setMaker.isPending}>
                  Make it in ChatGPT instead
                </Button>
              }
            />
          )}
        </div>
      ) : null}

      {showChatGpt ? (
        <>
          {!isSketch ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <NoteBox title="What the picture must show" content={task.whatToShow} />
              <NoteBox title="Why it's needed" content={task.reason} />
            </div>
          ) : null}

          <Section title="Make it in ChatGPT" step={isSketch ? 2 : 1}>
            {isSketch ? (
              <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                <span className="font-semibold text-[var(--sb-text)]">What to draw: </span>
                {task.whatToShow}
              </p>
            ) : null}
            {isSketch ? (
              <div className="flex flex-wrap items-center gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[length:var(--sb-text-sm)] font-semibold text-[var(--sb-text)]">First, the handwriting sheet</p>
                  <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                    {sheetUrl
                      ? "Paste it into a new ChatGPT chat, so the hand matches every other StudyBond sketch."
                      : "No sheet saved yet. Add it once with the Handwriting sheet button at the top of this page."}
                  </p>
                </div>
                {sheetUrl ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => copySheet(sheetUrl)}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy sheet
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
              <p className="text-[length:var(--sb-text-sm)] font-semibold text-[var(--sb-text)]">
                {isSketch ? "Then the prompt" : "The prompt"}
              </p>
              <p className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap text-[length:var(--sb-text-sm)] leading-relaxed text-[var(--sb-text-secondary)]">
                {task.prompt ?? "No prompt in the notes for this picture."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => task.prompt && copyText(task.prompt, "Prompt")} disabled={!task.prompt}>
                <Copy className="h-4 w-4" />
                Copy prompt
              </Button>
              {/* A sketch needs the sheet pasted first, and ChatGPT sends a
                  prompt in the link at once, so sketches get a plain link. */}
              <Button asChild href={isSketch ? "https://chatgpt.com/" : chatGptLink(task.prompt)} variant="secondary" target="_blank" rel="noopener noreferrer">
                {isSketch ? "Open ChatGPT" : "Open ChatGPT with this prompt"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
              {!isSketch ? (
                <Button type="button" variant="ghost" onClick={() => setMaker.mutate("CLAUDE")} isLoading={setMaker.isPending}>
                  Let Claude draw it instead
                </Button>
              ) : null}
            </div>
          </Section>

          <Section title="Paste it here" step={isSketch ? 3 : 2}>
            <PasteZone
              saveLabel={isSketch ? "Save into the explanation" : "Save to the question"}
              isSaving={save.isPending}
              onSave={(file, chosen) => save.mutateAsync({ file, strength: chosen })}
              checks={teamChecks}
            />
          </Section>
        </>
      ) : null}
    </div>
  );
}
