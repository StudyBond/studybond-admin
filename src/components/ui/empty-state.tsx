import { cn } from "@/lib/utils/cn";

/**
 * Shown when a list is legitimately empty.
 *
 * `description` should say what to do next, not restate the title.
 * Bad:  "No questions match the current filters."
 * Good: "Try a broader subject, or clear the year filter."
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-tertiary)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
