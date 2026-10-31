"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { useRefreshPictures } from "@/features/pictures/hooks/use-pictures";
import { picturesApi } from "@/lib/api/pictures";
import type { PictureStrength, PictureTask } from "@/lib/api/types";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ToastAction = { label: string; onClick: () => void };

/**
 * "Looks right, use it" and "Something's wrong" for a drawing waiting to be
 * checked. The Pictures page and content review both use it, so a drawing is
 * checked the same way wherever someone finds it.
 */
export function DrawingCheckActions({
  task,
  strength,
  beforeApprove,
  onApproved,
  approvedAction,
  extra,
}: {
  task: PictureTask;
  strength: PictureStrength;
  /** Runs before the picture is saved, for example to save edits it would otherwise collide with. */
  beforeApprove?: () => Promise<void>;
  onApproved: (updated: PictureTask) => void | Promise<void>;
  /** A button on the "saved" message, such as a link to the question. */
  approvedAction?: (updated: PictureTask) => ToastAction | undefined;
  /** Shown at the far end of the button row. */
  extra?: React.ReactNode;
}) {
  const refresh = useRefreshPictures();
  const [fixOpen, setFixOpen] = useState(false);
  const [fixNote, setFixNote] = useState("");

  const onError = (title: string) => (error: unknown) =>
    toast.error(title, { description: <ApiErrorMessage error={error} fallback="Please try again." /> });

  const approve = useMutation({
    mutationFn: async () => {
      await beforeApprove?.();
      return picturesApi.approve(task.id, strength);
    },
    onSuccess: async (updated) => {
      toast.success(
        task.kind === "EXPLANATION"
          ? `${task.label} sketch saved into the explanation`
          : `${task.label} picture saved to the question`,
        { action: approvedAction?.(updated) },
      );
      await refresh();
      await onApproved(updated);
    },
    onError: onError("Could not use the drawing"),
  });

  const sendBack = useMutation({
    mutationFn: () => picturesApi.sendBack(task.id, fixNote.trim()),
    onSuccess: async () => {
      setFixOpen(false);
      setFixNote("");
      toast.success("Sent back to Claude");
      await refresh();
    },
    onError: onError("Could not send it back"),
  });

  if (fixOpen) {
    return (
      <div className="space-y-3 border-t border-[var(--sb-border)] pt-4">
        <TextArea
          label="What should Claude change?"
          rows={3}
          value={fixNote}
          onChange={(event) => setFixNote(event.target.value)}
          placeholder="For example: the flat part should end at 3.5 s, not 3.0 s"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => sendBack.mutate()} isLoading={sendBack.isPending} disabled={fixNote.trim().length < 3 || sendBack.isPending}>
            Send back to Claude
          </Button>
          <Button type="button" variant="ghost" onClick={() => setFixOpen(false)}>
            Cancel
          </Button>
        </div>
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          Claude sees this note the next time someone asks it to work on pictures.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--sb-border)] pt-4">
      <Button type="button" onClick={() => approve.mutate()} isLoading={approve.isPending} disabled={approve.isPending}>
        <Check className="h-4 w-4" />
        Looks right, use it
      </Button>
      <Button type="button" variant="secondary" onClick={() => setFixOpen(true)}>
        Something&apos;s wrong
      </Button>
      <span className="flex-1" />
      {extra}
    </div>
  );
}
