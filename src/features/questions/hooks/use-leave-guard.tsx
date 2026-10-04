"use client";

import { UnsavedChangesDialog } from "@/features/questions/components/unsaved-changes-dialog";
import { useRouter } from "next/navigation";
import { type RefObject, useCallback, useEffect, useState } from "react";

/**
 * What the page needs from a screen that holds unsaved edits.
 *
 * The screen keeps this current through a ref rather than state, so a click
 * can be checked at the moment it happens, without waiting for a render.
 */
export type UnsavedDraft = {
  isDirty: () => boolean;
  save: () => Promise<unknown>;
};

type PendingAction = {
  action: () => void;
  /** Runs when the admin keeps editing, to put back what a control showed. */
  onCancel?: () => void;
};

/**
 * Stops unsaved edits being lost by accident.
 *
 * Covers three ways out of the page: actions the page takes itself (a filter,
 * the Queue/List switch, a move between questions), any link on the page
 * including the sidebar, and closing or reloading the tab. Back and forward
 * buttons are not covered, because the router gives no way to hold them.
 *
 * Returns `guard`, which runs an action now or asks first. `isOpen` is true
 * while the question is waiting for an answer. `dialog` is rendered once by
 * the page.
 */
export function useLeaveGuard(draftRef: RefObject<UnsavedDraft | null>) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [saving, setSaving] = useState(false);

  const isDirty = useCallback(
    () => draftRef.current?.isDirty() ?? false,
    [draftRef],
  );

  const guard = useCallback(
    (action: () => void, onCancel?: () => void) => {
      if (!isDirty()) {
        action();
        return;
      }
      setPending({ action, onCancel });
    },
    [isDirty],
  );

  /* Capture phase, so this runs before the router's own click handler and
     can stop the navigation. Only plain same-tab clicks to another page of
     this site are held. New tabs, downloads and the current page go ahead. */
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) {
        return;
      }
      if (!isDirty()) return;

      event.preventDefault();
      const href = url.pathname + url.search + url.hash;
      guard(() => router.push(href));
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [guard, isDirty, router]);

  /* Closing the tab or reloading would lose the changes with no warning. The
     browser words its own prompt; this only asks for it. */
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function leaveWithoutSaving() {
    const current = pending;
    setPending(null);
    current?.action();
  }

  /* The same save as the Save button. If it fails, the dialog stays open and
     the error toast says why, so the admin is still here to fix it. */
  async function saveAndLeave() {
    const current = pending;
    setSaving(true);
    try {
      await draftRef.current?.save();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
    setPending(null);
    current?.action();
  }

  function keepEditing() {
    const current = pending;
    setPending(null);
    current?.onCancel?.();
  }

  const dialog = (
    <UnsavedChangesDialog
      open={pending !== null}
      isSaving={saving}
      onSave={() => void saveAndLeave()}
      onLeave={leaveWithoutSaving}
      onStay={keepEditing}
    />
  );

  return { guard, isOpen: pending !== null, dialog };
}
