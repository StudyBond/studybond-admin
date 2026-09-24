"use client";

import { Button } from "@/components/ui/button";
import { StudentPreview } from "@/features/questions/components/student-preview";
import type { FormState } from "@/features/questions/lib/question-form-state";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * The whole question, as a student sees it, filling the screen.
 *
 * For screens too narrow to keep the preview beside the editors. Each field
 * already shows its own result underneath as it is edited, which is what
 * makes writing comfortable on a phone; this is the other half — the check
 * before publishing, where what matters is the finished card, all at once,
 * at a readable size. It carries its own Publish button so that check can end
 * in a decision without closing the sheet and finding the button behind it.
 *
 * Portalled to the body: the actions bar it opens from is sticky and creates
 * its own stacking context, which would otherwise trap the sheet underneath
 * the bottom navigation.
 *
 * Callers should pass a stable `onClose` (useCallback). The effect below
 * moves focus into the sheet when it opens and hands it back when it closes;
 * a new function each render would run that pair on every render.
 */
export function PreviewSheet({
  form,
  onClose,
  onPublish,
  isSaving,
  hasNext,
}: {
  form: FormState;
  onClose: () => void;
  onPublish: () => void;
  isSaving: boolean;
  hasNext: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Student view"
      tabIndex={-1}
      className="sb-fade fixed inset-0 z-50 flex flex-col bg-[var(--sb-bg)] outline-none"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--sb-border)] px-4">
        <h2 className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">
          Student view
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <StudentPreview form={form} />
      </div>

      {/* Clears the home-indicator area on phones that have one. */}
      <div className="flex shrink-0 gap-2 border-t border-[var(--sb-border)] bg-[var(--sb-surface-2)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onClose}
        >
          Keep editing
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={onPublish}
          disabled={isSaving}
          isLoading={isSaving}
        >
          Publish{hasNext ? " & next" : ""}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
