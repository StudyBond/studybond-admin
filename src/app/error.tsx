"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { getErrorMeta } from "@/lib/api/errors";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Was raw slate/rose Tailwind with an uppercase "Application error" kicker
 * and a cyan button, none of which match the app around it. The copy also
 * said "while rendering the admin workspace", which describes React's job
 * rather than telling the reader what to do.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const meta = getErrorMeta(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sb-bg)] px-6">
      <div className="w-full max-w-lg rounded-[var(--sb-radius-lg)] border border-[var(--sb-danger-ring)] bg-[var(--sb-surface-1)] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[length:var(--sb-text-xl)] font-semibold text-[var(--sb-text)]">
              Something went wrong
            </h1>
            <p className="mt-1.5 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
              This page could not be shown. Trying again often clears it.
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          <ApiErrorMessage error={error} />
        </p>

        {/* Kept for support to quote, not for the reader to interpret. */}
        {meta ? (
          <p className="sb-mono mt-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {meta}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild href="/" variant="secondary">
            Back to the dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
