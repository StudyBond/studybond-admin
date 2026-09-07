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
 *
 * The arrangement changed too. Each stat used to be its own rounded, bordered
 * box floating in a gap, and on a phone they stacked one per row — four
 * near-empty boxes and a lot of scrolling to read four numbers. That grid of
 * identical boxes is the most generic shape a dashboard can take.
 *
 * A stat row is now a single panel divided by hairlines: one border, one
 * surface, cells separated by a 1px gap that lets the panel's border colour
 * show through. It reads as one instrument rather than a pile of cards, and
 * it starts at two columns instead of one, so four numbers cost one screen
 * of height on a phone rather than four.
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
  /** Turns the whole cell into a link to the screen that resolves it. */
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
      <div className="flex items-center gap-1.5">
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
          <span className="ml-auto shrink-0 text-[var(--sb-text-tertiary)]">
            {icon}
          </span>
        ) : null}
        {href && !icon ? (
          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--sb-text-tertiary)] transition-transform duration-[var(--sb-duration-fast)] group-hover:translate-x-0.5" />
        ) : null}
      </div>

      {/* 24px, not 30px. The figure still leads the cell, but a stat does
          not need to shout to be found. */}
      <p
        className={cn(
          "sb-nums mt-1.5 text-[length:var(--sb-text-2xl)] font-semibold leading-none tracking-tight",
          statusStyle ? statusStyle.text : "text-[var(--sb-text)]",
        )}
      >
        {value}
      </p>

      {hint ? (
        <p className="mt-1.5 line-clamp-2 text-[length:var(--sb-text-xs)] leading-snug text-[var(--sb-text-tertiary)]">
          {hint}
        </p>
      ) : null}
    </>
  );

  /* No border and no radius of its own: the surrounding panel owns both,
     and the 1px grid gap draws the division. */
  const shell = cn(
    "block min-w-0 bg-[var(--sb-surface-1)] p-3.5 sm:p-4",
    "transition-colors duration-[var(--sb-duration-fast)]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn(shell, "group hover:bg-[var(--sb-surface-2)]")}>
        {content}
      </Link>
    );
  }

  return <div className={shell}>{content}</div>;
}

/**
 * One panel, hairline-divided.
 *
 * The 1px gap over a border-coloured background is what draws the lines, so
 * the count of cells never has to be reasoned about — there are no per-cell
 * border sides to get right. Every stat row in the app divides evenly into
 * its column count, so no cell is ever left empty.
 *
 * Ladder: 2 columns → 4 at 1024px. Pages that hold 2, 3 or 6 stats override
 * the desktop count and keep the same mobile behaviour.
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
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--sb-radius-lg)]",
        "border border-[var(--sb-border)] bg-[var(--sb-border)]",
        "lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
