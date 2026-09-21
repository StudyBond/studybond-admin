"use client";

import { X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

type ImageLightboxProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

/**
 * Full-screen image viewer. Ported from studybond-web's ImageLightbox —
 * same behavior (Escape, backdrop click, body-scroll lock while open) —
 * restyled onto the admin's own tokens since this is chrome, not part of
 * what a student sees.
 */
export function ImageLightbox({ src, alt = "Image", onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!src) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [src, handleKeyDown]);

  if (!src) return null;

  const content = (
    <div className="sb-fade fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-sm"
        onClick={onClose}
      />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-secondary)] transition-colors hover:text-[var(--sb-text)]"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="relative z-[1] max-h-[90vh] max-w-[95vw] rounded-[var(--sb-radius-lg)] object-contain shadow-[var(--sb-shadow-xl)]"
      />
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
}
