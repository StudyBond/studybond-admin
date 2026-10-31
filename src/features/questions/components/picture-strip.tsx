"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DrawingCheckActions } from "@/features/pictures/components/drawing-check";
import { NoteBox, pictureStatus } from "@/features/pictures/components/picture-panel";
import { StrengthPicker, WatermarkPreview } from "@/features/pictures/components/watermark-preview";
import { usePicture } from "@/features/pictures/hooks/use-pictures";
import { picturePageHref } from "@/features/pictures/lib/picture-rules";
import type { OpenPicture, PictureStrength, PictureTask } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { ArrowUpRight, ImageIcon, TriangleAlert } from "lucide-react";
import { useState } from "react";

/**
 * The pictures a question in review is still waiting for, at the top of the
 * reviewer. Claude's drawings are checked right here; anything still being
 * made opens on the Pictures page in a new tab, so the queue stays put.
 *
 * While the question's own picture is missing, Publish is off and this says
 * why. A sketch still to come in the explanation does not stop publishing.
 */
export function PictureStrip({
  pictures,
  blocking,
  sharedRowId,
  beforeApprove,
  onApproved,
}: {
  pictures: OpenPicture[];
  blocking: OpenPicture | null;
  sharedRowId: number | null;
  /** Saves edits first, so the picture and the edits do not overwrite each other. */
  beforeApprove: () => Promise<void>;
  onApproved: (task: PictureTask) => void | Promise<void>;
}) {
  const [openId, setOpenId] = useState<number | null>(
    () => pictures.find((picture) => picture.status === "READY_TO_CHECK")?.id ?? null,
  );
  const sketchesOnly = !pictures.some((picture) => picture.kind === "QUESTION");

  return (
    <section
      aria-label="Pictures this question is waiting for"
      className={cn(
        "space-y-3 rounded-[var(--sb-radius)] border p-3",
        blocking
          ? "border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)]"
          : "border-[var(--sb-border)] bg-[var(--sb-bg-inset)]",
      )}
    >
      <p
        className={cn(
          "flex items-start gap-2 text-[length:var(--sb-text-sm)]",
          blocking ? "text-[var(--sb-warning)]" : "text-[var(--sb-text-secondary)]",
        )}
      >
        {blocking ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <ImageIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>
          {blocking
            ? blocking.status === "READY_TO_CHECK"
              ? "Publish is off until the picture is on. Check Claude's drawing below."
              : "Publish is off until the picture is on. It is still being made on the Pictures page."
            : sketchesOnly
              ? "You can publish. The explanation sketch is added later; until then students see it described in words."
              : "Its picture is on. You can publish."}
        </span>
      </p>

      <ul className="space-y-2">
        {pictures.map((picture) => {
          const status = pictureStatus(picture);
          const canCheckHere = picture.status === "READY_TO_CHECK";
          const isOpen = openId === picture.id;
          return (
            <li key={picture.id} className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                <span className="font-mono text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">{picture.label}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">{picture.title}</span>
                  <span className="block text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    {picture.kind === "EXPLANATION"
                      ? "Explanation sketch"
                      : picture.onSharedRow
                        ? `Shared picture, on #${sharedRowId}`
                        : "Question picture"}{" "}
                    · {picture.maker === "CLAUDE" ? "Claude" : "ChatGPT"}
                  </span>
                </span>
                <Badge tone={status.tone}>{status.label}</Badge>
                {canCheckHere ? (
                  <Button type="button" variant={isOpen ? "ghost" : "secondary"} size="sm" onClick={() => setOpenId(isOpen ? null : picture.id)}>
                    {isOpen ? "Hide" : "Check it here"}
                  </Button>
                ) : (
                  <Button asChild href={picturePageHref(picture.id)} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" title="Opens the Pictures page in a new tab">
                    Pictures page
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {canCheckHere && isOpen ? (
                <DrawingCheck id={picture.id} beforeApprove={beforeApprove} onApproved={onApproved} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Claude's drawing with the mark as it will be stamped, what to look for, and the two answers. */
function DrawingCheck({
  id,
  beforeApprove,
  onApproved,
}: {
  id: number;
  beforeApprove: () => Promise<void>;
  onApproved: (task: PictureTask) => void | Promise<void>;
}) {
  const taskQuery = usePicture(id);
  const [strength, setStrength] = useState<PictureStrength>("normal");
  const task = taskQuery.data;

  if (!task) {
    return (
      <div className="border-t border-[var(--sb-border)] p-3">
        {taskQuery.isError ? (
          <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            Could not load the drawing. Open it on the Pictures page instead.
          </p>
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-[var(--sb-border)] p-3">
      {task.draftImageUrl ? (
        <WatermarkPreview src={task.draftImageUrl} strength={strength} alt={task.title} className="mx-auto w-full max-w-[30rem]" />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">StudyBond mark</span>
        <StrengthPicker value={strength} onChange={setStrength} />
      </div>
      <NoteBox title="Look for these" content={task.whatToShow} />
      <NoteBox title="Note from the question file" content={task.teamNote} />
      <DrawingCheckActions
        task={task}
        strength={strength}
        beforeApprove={beforeApprove}
        onApproved={onApproved}
        extra={
          <Button asChild href={picturePageHref(task.id)} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm">
            Pictures page
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        }
      />
    </div>
  );
}
