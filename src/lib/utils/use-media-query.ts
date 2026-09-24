import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches right now, and updates when it changes.
 *
 * For the places where CSS alone would be wasteful: hiding something with
 * `lg:hidden` still renders it, so a component that draws LaTeX would be
 * drawn twice on every keystroke — once shown, once hidden. This decides
 * what to render at all.
 *
 * Use rem units in the query when it needs to line up with a Tailwind
 * breakpoint: `(min-width: 64rem)` is `lg`, exactly, and stays in step if
 * the browser's base font size is changed, which a pixel query would not.
 *
 * The server snapshot is `false`. That only matters while a page is being
 * hydrated; the review queue mounts after its data arrives, on the client,
 * so it reads the real value on its first render.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
