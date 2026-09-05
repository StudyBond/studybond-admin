import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ArrowRight } from "lucide-react";

/**
 * Replaces MetricCard.
 *
 * Two things changed beyond styling:
 *
 * 1. The old card carried two effects that never rendered — a radial glow
 *    whose inline `style={{opacity: 0}}` overrode its own hover class, and a
 *    shadow built by string concatenation, which Tailwind cannot compile.
 *    Both are gone rather than fixed; a stat does not need a glow.
 *
 * 2. `status` is optional and means something. The old card required a
 *    colour, so pages assigned cyan/emerald/amber/rose for variety — which
 *    is how "Premium expiring" ended up red and "Live collaborations" green
 *    on the same row. A number with nothing wrong with it gets no colour.
 */
type StatStatus = "success" | "warning" | "danger" | "info";

const statusStyles: Record<StatStatus, { dot: string; text: string }> = {
  success: { dot: "bg-[var(--sb-success)]", text: "text-[var(--sb-success)]" },
  warning: { dot: "bg-[var(--sb-warning)]", text: "text-[var(--sb-warning)]" },
  danger: { dot: "bg-[var(--sb-danger)]", text: "text-[var(--sb-danger)]" },
  info: { dot: "bg-[var(--sb-info)]", text: "text-[var(--sb-info)]" },
};

export type StatCardProps = {
  label: string;
  value: string;
  /** Supporting line. Keep it factual — it sits under the number. */
  hint?: string;
  /** Only set when the number itself is good, bad, or needs attention. */
  status?: StatStatus;
  /** Turns the whole card into a link to the screen that resolves it. */
  href?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  status,
  href,
  icon,
  className,
}: StatCardProps) {
  const statusStyle = status ? statusStyles[status] : null;

  const content = (
    <>
      <div className="flex items-center gap-2">
        {statusStyle ? (
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusStyle.dot)}
            aria-hidden="true"
          />
        ) : null}
        <p className="min-w-0 truncate text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
          {label}
        </p>
        {icon ? (
          <span className="ml-auto text-[var(--sb-text-tertiary)]">{icon}</span>
        ) : null}
        {href && !icon ? (
          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--sb-text-tertiary)] transition-transform duration-[var(--sb-duration-fast)] group-hover:translate-x-0.5" />
        ) : null}
      </div>

      <p
        className={cn(
          "sb-nums mt-2 text-[length:var(--sb-text-3xl)] font-semibold leading-none tracking-tight",
          statusStyle ? statusStyle.text : "text-[var(--sb-text)]",
        )}
      >
        {value}
      </p>

      {hint ? (
        <p className="mt-2 line-clamp-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
          {hint}
        </p>
      ) : null}
    </>
  );

  const shell = cn(
    "block rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5",
    "transition-colors duration-[var(--sb-duration-fast)]",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          shell,
          "group hover:border-[var(--sb-border-hover)] hover:bg-[var(--sb-surface-2)]",
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={shell}>{content}</div>;
}

/**
 * Standard stat row. One breakpoint ladder for every page, so stat grids
 * stop differing from screen to screen: 1 col → 2 at 480px → 4 at 1024px.
 */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
