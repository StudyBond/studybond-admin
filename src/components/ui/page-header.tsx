import { cn } from "@/lib/utils/cn";

/**
 * Replaces SectionHeading.
 *
 * The old component forced an `eyebrow` on every page and card — a tiny
 * coloured uppercase word above the title. 41 blocks used it, which made
 * every screen look like the same template and produced empty headings
 * like "Quick actions / Go to". A page has a title. If it needs more, it
 * gets a sentence, not a decorative kicker.
 *
 * `meta` is for live status (last updated, environment). `action` is for
 * buttons. On mobile actions drop below the title and stretch full width.
 */
export function PageHeader({
  title,
  description,
  meta,
  action,
  className,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[length:var(--sb-text-2xl)] font-semibold tracking-tight text-[var(--sb-text)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[length:var(--sb-text-base)] leading-relaxed text-[var(--sb-text-secondary)]">
            {description}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>
        ) : null}
      </div>

      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {action}
        </div>
      ) : null}
    </header>
  );
}

/** Heading for a group of cards inside a page. Plain, no kicker. */
export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
