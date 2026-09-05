"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle } from "lucide-react";

/**
 * One error presentation for every failed query in the admin.
 *
 * Previously each page hand-rolled its own red card with slightly different
 * copy and padding. Route all load failures through this so a failure looks
 * the same wherever an admin hits one.
 */
export function ErrorState({
  title = "Could not load this data",
  error,
  fallback = "Check that the backend is running and this account has admin access.",
  onRetry,
  className,
}: {
  title?: string;
  error?: unknown;
  fallback?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] p-4 sm:flex-row sm:items-center sm:p-5",
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] bg-[rgba(248,113,113,0.12)] text-[var(--sb-danger)]">
        <AlertTriangle className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">
          {title}
        </p>
        <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
          <ApiErrorMessage error={error} fallback={fallback} />
        </p>
      </div>

      {onRetry ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="shrink-0"
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
