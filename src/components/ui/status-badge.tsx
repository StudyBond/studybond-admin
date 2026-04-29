import { cn } from "@/lib/utils/cn";

const toneStyles = {
  cyan: "border-[color:var(--accent-cyan)]/18 bg-[color:var(--accent-cyan)]/8 text-[#d2f0eb]",
  emerald: "border-[color:var(--accent-emerald)]/18 bg-[color:var(--accent-emerald)]/8 text-[#e0f0cc]",
  amber: "border-[color:var(--accent-amber)]/18 bg-[color:var(--accent-amber)]/8 text-[#f2e0c4]",
  rose: "border-[color:var(--accent-rose)]/18 bg-[color:var(--accent-rose)]/8 text-[#f0d5d2]",
  slate: "border-white/8 bg-white/[0.03] text-[color:var(--foreground)]",
};

export function StatusBadge({
  children,
  tone = "slate",
  pulse = false,
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneStyles;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] sm:px-2.5 sm:text-[11px] sm:tracking-[0.14em]",
        toneStyles[tone],
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inset-0 rounded-full opacity-60",
              tone === "emerald" ? "bg-[color:var(--accent-emerald)]"
                : tone === "cyan" ? "bg-[color:var(--accent-cyan)]"
                : tone === "amber" ? "bg-[color:var(--accent-amber)]"
                : tone === "rose" ? "bg-[color:var(--accent-rose)]"
                : "bg-white",
              "animate-ping",
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              tone === "emerald" ? "bg-[color:var(--accent-emerald)]"
                : tone === "cyan" ? "bg-[color:var(--accent-cyan)]"
                : tone === "amber" ? "bg-[color:var(--accent-amber)]"
                : tone === "rose" ? "bg-[color:var(--accent-rose)]"
                : "bg-white",
            )}
          />
        </span>
      ) : null}
      {children}
    </span>
  );
}
