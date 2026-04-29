import { cn } from "@/lib/utils/cn";

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  glow?: "cyan" | "emerald" | "amber" | "rose" | "none";
  interactive?: boolean;
};

const glowStyles: Record<NonNullable<SurfaceProps["glow"]>, string> = {
  cyan: "shadow-[0_0_0_1px_rgba(110,196,184,0.08),0_16px_40px_rgba(6,78,59,0.10)]",
  emerald: "shadow-[0_0_0_1px_rgba(125,179,79,0.08),0_16px_40px_rgba(63,98,18,0.10)]",
  amber: "shadow-[0_0_0_1px_rgba(196,148,74,0.08),0_16px_40px_rgba(146,64,14,0.10)]",
  rose: "shadow-[0_0_0_1px_rgba(184,120,114,0.08),0_16px_40px_rgba(127,29,29,0.10)]",
  none: "",
};

export function Surface({
  className,
  glow = "none",
  interactive = false,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] backdrop-blur-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)]",
        glowStyles[glow],
        interactive && [
          "cursor-pointer",
          "hover:border-white/12 hover:shadow-[0_12px_44px_rgba(0,0,0,0.18)]",
          "hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-[0_4px_20px_rgba(0,0,0,0.10)]",
        ],
        className,
      )}
      {...props}
    />
  );
}
