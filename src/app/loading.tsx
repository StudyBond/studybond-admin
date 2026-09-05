import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root loading boundary.
 *
 * Only reached before a layout exists to render into — the first paint, and
 * the auth screens. Console routes have their own boundary at
 * `(admin)/loading.tsx`, which keeps the sidebar and topbar in place.
 *
 * What used to be here was a full-screen splash: an animate-ping halo behind
 * a blurred circle behind a spinner, captioned "INITIALIZING ADMIN
 * WORKSPACE..." in letter-spaced uppercase. Because it lived at the root it
 * fired on every navigation inside the console and took the whole shell down
 * with it each time.
 */
export default function Loading() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-5 py-12"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="w-full max-w-[26rem] space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
    </main>
  );
}
