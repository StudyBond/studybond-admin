/**
 * Where to scroll the student preview so the block being edited is on
 * screen — or null when it already is.
 *
 * Returning null in the common case is the point. If the preview scrolled on
 * every focus change it would twitch as the reviewer moves between fields
 * that are both already visible. It only moves when it has to.
 *
 * When it does move, it centres the block rather than pushing it to the
 * nearest edge: after a jump, the eye looks for the thing in the middle of
 * the panel first. A block taller than the panel cannot be centred, so its
 * start is lined up instead and the reviewer can scroll on from there.
 *
 * All four measurements are in the same unit (pixels) and relative to the
 * top of the scrollable content, not the viewport.
 */
export function scrollTopToReveal({
  scrollTop,
  viewportHeight,
  elementTop,
  elementHeight,
  padding = 16,
}: {
  /** How far the panel is scrolled right now. */
  scrollTop: number;
  /** The visible height of the panel. */
  viewportHeight: number;
  /** The block's top edge, measured from the top of the scrollable content. */
  elementTop: number;
  elementHeight: number;
  /** Breathing room kept between the block and the panel's edge. */
  padding?: number;
}): number | null {
  const elementBottom = elementTop + elementHeight;
  const isVisible =
    elementTop >= scrollTop + padding &&
    elementBottom <= scrollTop + viewportHeight - padding;

  if (isVisible) return null;

  if (elementHeight > viewportHeight - padding * 2) {
    return Math.max(0, elementTop - padding);
  }

  return Math.max(0, elementTop - (viewportHeight - elementHeight) / 2);
}

/**
 * Where to scroll while a field is being typed in.
 *
 * A short block is kept whole, exactly as scrollTopToReveal does. A block
 * taller than the panel can never fit, so the whole block is the wrong thing
 * to keep in view: what matters is the line the cursor is on. The preview
 * cannot know the cursor's exact line in the rendered output, so the cursor's
 * position through the raw text (`caretFraction`, 0 to 1) is applied to the
 * rendered block's height. That is an approximation, and it is good enough to
 * keep the area being typed in on screen.
 *
 * Returns null when the cursor's line is already in view.
 */
export function scrollTopToFollow({
  scrollTop,
  viewportHeight,
  elementTop,
  elementHeight,
  caretFraction,
  padding = 16,
}: {
  scrollTop: number;
  viewportHeight: number;
  elementTop: number;
  elementHeight: number;
  /** Where the cursor sits in the raw text, 0 (start) to 1 (end), or null if unknown. */
  caretFraction: number | null;
  padding?: number;
}): number | null {
  const fits = elementHeight <= viewportHeight - padding * 2;
  if (fits || caretFraction === null) {
    return scrollTopToReveal({ scrollTop, viewportHeight, elementTop, elementHeight, padding });
  }

  const clamped = Math.min(1, Math.max(0, caretFraction));
  const caretY = elementTop + clamped * elementHeight;
  const isVisible =
    caretY >= scrollTop + padding && caretY <= scrollTop + viewportHeight - padding;

  if (isVisible) return null;
  return Math.max(0, caretY - viewportHeight / 2);
}
