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
