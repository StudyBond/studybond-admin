type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--accent-amber)]">{eyebrow}</p>
        <h1 className="mt-2.5 text-[1.85rem] font-semibold tracking-tight text-white sm:text-3xl md:text-[2rem]">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)] md:leading-7">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="w-full md:w-auto md:shrink-0">{action}</div> : null}
    </div>
  );
}
