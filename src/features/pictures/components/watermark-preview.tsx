"use client";

import type { PictureStrength } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

/** Same opacities the server uses (picture-placement.ts in the backend). */
const OPACITY: Record<PictureStrength, number> = {
  light: 0.18,
  normal: 0.25,
  strong: 0.32,
};

const STRENGTHS: { value: PictureStrength; label: string }[] = [
  { value: "light", label: "Lighter" },
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Stronger" },
];

/**
 * A picture with the StudyBond mark drawn over it the way the server will
 * stamp it: one amber wordmark, about 60% of the width, tilted up 30 degrees.
 */
export function WatermarkPreview({
  src,
  strength,
  alt,
  className,
}: {
  src: string;
  strength: PictureStrength;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--sb-radius)] bg-white",
        className,
      )}
      style={{ containerType: "inline-size" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob or a Cloudinary address, not a static asset */}
      <img src={src} alt={alt} className="block h-auto w-full" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 select-none whitespace-nowrap font-extrabold"
        style={{
          fontSize: "12cqw",
          color: "#DE862D",
          opacity: OPACITY[strength],
          mixBlendMode: "multiply",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          fontFamily: "Nunito, 'Arial Rounded MT Bold', var(--font-sans), sans-serif",
        }}
      >
        StudyBond
      </span>
    </div>
  );
}

export function StrengthPicker({
  value,
  onChange,
  className,
}: {
  value: PictureStrength;
  onChange: (value: PictureStrength) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="StudyBond mark strength"
      className={cn(
        "inline-flex gap-0.5 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-0.5",
        className,
      )}
    >
      {STRENGTHS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 rounded-[var(--sb-radius-sm)] px-3 text-[length:var(--sb-text-xs)] font-medium transition-colors duration-[var(--sb-duration-fast)]",
            value === option.value
              ? "bg-[var(--sb-surface-3)] text-[var(--sb-text)] shadow-[var(--sb-shadow-sm)]"
              : "text-[var(--sb-text-secondary)] hover:text-[var(--sb-text)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
