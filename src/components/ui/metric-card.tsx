import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils/cn";

const toneAccent = {
  cyan: "bg-[color:var(--accent-cyan)]",
  emerald: "bg-[color:var(--accent-emerald)]",
  amber: "bg-[color:var(--accent-amber)]",
  rose: "bg-[color:var(--accent-rose)]",
};

const toneGlow = {
  cyan: "shadow-[0_0_8px_rgba(110,196,184,0.25)]",
  emerald: "shadow-[0_0_8px_rgba(125,179,79,0.25)]",
  amber: "shadow-[0_0_8px_rgba(196,148,74,0.25)]",
  rose: "shadow-[0_0_8px_rgba(184,120,114,0.25)]",
};

export function MetricCard({
  label,
  value,
  delta,
  tone,
  className,
  style,
}: {
  label: string;
  value: string;
  delta: string;
  tone: keyof typeof toneAccent;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Surface
      className={cn(
        "group admin-enter relative overflow-hidden p-4 sm:p-5",
        "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)]",
        "hover:-translate-y-0.5 hover:border-white/10",
        className,
      )}
      style={style}
    >
      {/* Top shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Tone glow on hover - subtle background radial */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
          toneAccent[tone],
        )}
        style={{ opacity: 0 }}
      />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full transition-shadow duration-300",
              toneAccent[tone],
              "group-hover:" + toneGlow[tone].replace("shadow-", "shadow-"),
            )}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)] sm:text-[11px] sm:tracking-[0.18em]">
            {label}
          </p>
        </div>

        <p className="mt-3 text-[2rem] font-semibold tracking-tight text-white sm:mt-4 sm:text-3xl">
          {value}
        </p>

        <p className="mt-1.5 text-xs text-[color:var(--muted-foreground)] transition-colors group-hover:text-[color:var(--foreground)]/70 sm:mt-2 sm:text-sm">
          {delta}
        </p>
      </div>
    </Surface>
  );
}
