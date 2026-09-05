import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for every console route.
 *
 * This file is new, and it is the reason the root `app/loading.tsx` could be
 * cut down. A loading boundary replaces everything below the layout it sits
 * beside — so the old root-level splash ("StudyBond / INITIALIZING ADMIN
 * WORKSPACE...", a pinging halo behind a blurred spinner) tore down the
 * sidebar and topbar on every single navigation between admin pages.
 *
 * Living inside the (admin) group, this one renders in the content area and
 * leaves the shell standing. It is shaped like the pages that follow —
 * heading, stat row, table — so the layout does not jump when data lands.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>

      <Skeleton className="h-72 w-full" />
    </div>
  );
}
