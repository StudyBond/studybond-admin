import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("sb-skeleton", className)} aria-hidden="true" />;
}

/**
 * A cell inside StatGrid's panel, so it carries no border or radius of its
 * own and matches the loaded cell's rhythm — nothing shifts on load.
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-[var(--sb-surface-1)] p-3.5 sm:p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-6 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

/** Placeholder rows for a table or list while it loads. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4 sm:p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
