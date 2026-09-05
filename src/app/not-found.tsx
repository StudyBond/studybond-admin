import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

/**
 * Shown for a URL that does not resolve to a page.
 *
 * Was styled in raw slate/cyan Tailwind — colours that exist nowhere else in
 * the app now — under an uppercase "404" kicker. A person who lands here
 * needs a way back, not a status code set in letter-spaced capitals.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sb-bg)] px-6">
      <div className="w-full max-w-md rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-6 text-center sm:p-8">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] text-[var(--sb-text-tertiary)]">
          <FileQuestion className="h-5 w-5" />
        </div>

        <h1 className="mt-4 text-[length:var(--sb-text-xl)] font-semibold text-[var(--sb-text)]">
          That page does not exist
        </h1>
        <p className="mt-2 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
          The address may have changed, or the link that brought you here is
          out of date.
        </p>

        <div className="mt-5 flex justify-center">
          <Button asChild href="/">
            Back to the dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
