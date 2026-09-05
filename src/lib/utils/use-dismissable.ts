"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Open/close state for a menu or popover, with the two dismissals people
 * expect: a click outside, and Escape.
 *
 * The topbar chips previously opened on hover only. That is fine with a
 * mouse and unusable without one — on a phone or tablet there is no hover,
 * so the step-up popover and the "Clear session" button inside it could not
 * be reached at all, and keyboard users could not reach them either. Escape
 * did nothing, because nothing was listening.
 *
 * `pointerdown` rather than `mousedown` so it fires for touch too.
 */
export function useDismissable<T extends HTMLElement>() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return { isOpen, setIsOpen, ref };
}
