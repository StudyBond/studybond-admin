"use client";

import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Asked before the reviewer leaves a question that has changes nobody saved.
 *
 * Three ways out. Save and continue is the primary action, so Enter keeps the
 * work. Leaving without saving sits beside it as a plain button, never the
 * default, so a reflex Enter cannot throw the changes away. Escape means keep
 * editing. While a save is running nothing can be clicked away, because the
 * save may still fail and the reviewer has to be there when it does.
 *
 * Portalled to the body and scroll-locked, for the same reason as the preview
 * sheet: the actions bar it opens from is sticky and would sit over it.
 */
export function UnsavedChangesDialog({
  open,
  isSaving,
  onSave,
  onLeave,
  onStay,
}: {
  open: boolean;
  isSaving: boolean;
  onSave: () => void;
  onLeave: () => void;
  onStay: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Focus and scroll lock depend only on `open`. Re-running them on every
     render would pull focus back to the first button each time the parent
     re-renders, which it does while a save is running. */
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-primary]")?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        event.preventDefault();
        onStay();
        return;
      }
      if (event.key !== "Tab") return;

      /* Keeps Tab inside the dialog. Only the buttons can take focus here,
         so the first and last are the two ends of the cycle. */
      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
      );
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isSaving, onStay]);

  if (!open) return null;

  return createPortal(
    <div className="sb-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md space-y-5 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] p-5 shadow-[var(--sb-shadow)]"
      >
        <div className="space-y-1.5">
          <h2
            id={titleId}
            className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]"
          >
            Save your changes first?
          </h2>
          <p
            id={descriptionId}
            className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]"
          >
            You changed this question and have not saved it. If you leave now,
            those changes are lost.
          </p>
        </div>

        {/* On a phone the primary action is on top. On wider screens it is
            the right-hand button, where the eye lands last. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onStay} disabled={isSaving}>
            Keep editing
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onLeave}
            disabled={isSaving}
          >
            Leave without saving
          </Button>
          <Button
            type="button"
            data-primary
            onClick={onSave}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {!isSaving ? <Save className="h-3.5 w-3.5" /> : null}
            Save and continue
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
