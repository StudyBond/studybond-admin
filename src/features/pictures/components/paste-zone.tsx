"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import type { PictureStrength } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { ClipboardPaste, ImageUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StrengthPicker, WatermarkPreview } from "./watermark-preview";

const KBD =
  "rounded-[var(--sb-radius-sm)] border border-[var(--sb-border-active)] bg-[var(--sb-surface-3)] px-1.5 py-0.5 font-mono text-[length:var(--sb-text-xs)]";

/**
 * Takes the finished picture: Ctrl+V anywhere on the page, a dropped file, or
 * a chosen file. Shows it with the StudyBond mark the server will add, then
 * hands it to `onSave`.
 */
export function PasteZone({
  saveLabel,
  onSave,
  isSaving,
  checks,
}: {
  saveLabel: string;
  onSave: (file: File, strength: PictureStrength) => Promise<unknown>;
  isSaving: boolean;
  checks?: React.ReactNode;
}) {
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [strength, setStrength] = useState<PictureStrength>("normal");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const file = picked?.file ?? null;

  function take(next: File | null | undefined) {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      toast.error("That is not a picture", {
        description: "Copy the picture itself, not its link or the chat text.",
      });
      return;
    }
    setPicked({ file: next, url: URL.createObjectURL(next) });
  }

  // Frees the preview address when the picture is replaced, cleared or the
  // box goes away.
  useEffect(() => {
    if (!picked) return;
    const { url } = picked;
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  // Ctrl+V works anywhere on the page while there is nothing pasted yet,
  // except inside a text box, where it should paste text as usual.
  useEffect(() => {
    if (file) return;
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input")) return;
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith("image/"),
      );
      const pasted = item?.getAsFile();
      if (!pasted) {
        toast.error("There is no picture to paste", {
          description: "In ChatGPT, right-click the picture and choose Copy image, then try again.",
        });
        return;
      }
      event.preventDefault();
      take(pasted);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [file]);

  async function save() {
    if (!file) return;
    try {
      await onSave(file, strength);
      setPicked(null);
    } catch (error) {
      toast.error("Could not save the picture", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    }
  }

  if (picked) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <WatermarkPreview src={picked.url} strength={strength} alt="The pasted picture" />
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-[length:var(--sb-text-sm)] font-semibold text-[var(--sb-text)]">
              StudyBond mark
            </p>
            <StrengthPicker value={strength} onChange={setStrength} className="mt-2" />
            <p className="mt-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              The server adds it when you save. Go lighter if it covers a label or a number.
            </p>
          </div>
          {checks}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} isLoading={isSaving} disabled={isSaving}>
              {saveLabel}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPicked(null)} disabled={isSaving}>
              Paste a different one
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        take(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-[var(--sb-radius-lg)] border-[1.5px] border-dashed px-5 py-7 text-center transition-colors duration-[var(--sb-duration-fast)]",
        isDragging
          ? "border-[var(--sb-accent)] bg-[var(--sb-accent-soft)]"
          : "border-[var(--sb-border-active)] bg-[var(--sb-bg-inset)]",
      )}
    >
      <ClipboardPaste className="h-6 w-6 text-[var(--sb-text-secondary)]" aria-hidden="true" />
      <p className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">
        Press <kbd className={KBD}>Ctrl</kbd> + <kbd className={KBD}>V</kbd> to paste the picture
      </p>
      <p className="max-w-md text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
        In ChatGPT, right-click the picture and choose Copy image. You can also drop a file here.
      </p>
      <Button type="button" variant="secondary" size="sm" className="mt-1" onClick={() => inputRef.current?.click()}>
        <ImageUp className="h-3.5 w-3.5" />
        Choose a file
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
