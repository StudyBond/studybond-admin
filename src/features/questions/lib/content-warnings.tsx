/**
 * Shows what the server noticed about a question that was just saved.
 *
 * The server runs the same checks on a single edit that it runs on a bulk
 * upload, and sends back `contentWarnings`. The commonest one by far is an
 * option named by a bare letter — "the answer is B" — which is only right until
 * the options are shuffled, and then quietly points at the wrong option.
 *
 * The save has already happened. None of this blocks anything, so the warning
 * must not behave like an error: no red, no "failed", and the admin can carry
 * on and ignore it.
 *
 * It does not disappear on its own. A warning that vanishes after four seconds
 * is a warning nobody reads, and these are worth reading — but the admin
 * dismisses it when they are done with it, rather than it being dismissed for
 * them.
 */

import { toast } from "sonner";

/** Anything the save endpoints send back. */
interface SavedWithWarnings {
  contentWarnings?: string[];
}

export function notifyContentWarnings(
  saved: SavedWithWarnings | null | undefined,
  savedMessage: string,
): void {
  const warnings = saved?.contentWarnings ?? [];

  if (warnings.length === 0) {
    toast.success(savedMessage);
    return;
  }

  toast.warning(
    warnings.length === 1
      ? `${savedMessage}. One thing worth a look`
      : `${savedMessage}. ${warnings.length} things worth a look`,
    {
      description: (
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ),
      duration: Infinity,
      closeButton: true,
    },
  );
}
