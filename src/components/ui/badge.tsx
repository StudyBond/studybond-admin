import { cn } from "@/lib/utils/cn";

/**
 * Tones are named for MEANING, not for colour.
 *
 * There is deliberately no `cyan` / `rose` / `amber` here. Naming a tone
 * after its colour is what let the old UI paint "Premium expiring" red and
 * "Live collaborations" green purely for variety, so a new admin could not
 * learn what a colour meant. Pick a tone by what the value *is*:
 *
 *   neutral  — a fact, no judgement       (counts, ids, labels)
 *   success  — healthy / done / active
 *   warning  — needs attention soon
 *   danger   — broken / blocked / failed
 *   info     — in progress / informational
 *   brand    — StudyBond itself           (institution, plan)
 *   premium  — paid tier only
 */
const toneStyles = {
  neutral:
    "border-[var(--sb-border)] bg-[var(--sb-surface-3)] text-[var(--sb-text-secondary)]",
  success:
    "border-[var(--sb-success-ring)] bg-[var(--sb-success-soft)] text-[var(--sb-success)]",
  warning:
    "border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]",
  danger:
    "border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]",
  info: "border-[var(--sb-info-ring)] bg-[var(--sb-info-soft)] text-[var(--sb-info)]",
  brand:
    "border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] text-[var(--sb-accent-text)]",
  premium:
    "border-[rgba(212,161,33,0.22)] bg-[var(--sb-gold-soft)] text-[var(--sb-gold)]",
};

export type BadgeTone = keyof typeof toneStyles;

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-[var(--sb-radius-full)] border px-2 py-0.5",
        "text-[length:var(--sb-text-xs)] font-medium leading-5",
        toneStyles[tone],
        className,
      )}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
