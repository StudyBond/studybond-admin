"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { getErrorMeta } from "@/lib/api/errors";
import { useEffect } from "react";

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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-lg rounded-3xl border border-rose-900/40 bg-slate-900 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-rose-300">
          Application error
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-400">
          We hit an unexpected error while rendering the admin workspace.
        </p>
        <p className="mt-4 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-500">
          <ApiErrorMessage error={error} />
        </p>
        {meta ? (
          <p className="mt-3 text-[11px] text-slate-500">{meta}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
