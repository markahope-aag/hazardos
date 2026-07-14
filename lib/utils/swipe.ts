// Swipe-to-navigate decision logic for the mobile survey wizard, kept as a
// pure function so it can be unit-tested without a DOM. The wizard feeds it
// the pointer delta from a completed gesture and whether each direction is
// available; it returns which step transition (if any) the gesture maps to.

export const SWIPE_THRESHOLD_PX = 50

export type SwipeAction = 'back' | 'next' | null

export interface SwipeBounds {
  /** Is there a previous step to swipe back to? */
  canGoBack: boolean
  /** Is there a next step to swipe forward to? */
  canGoNext: boolean
  /** Minimum horizontal travel to count as a swipe. Defaults to SWIPE_THRESHOLD_PX. */
  threshold?: number
}

/**
 * Resolve a completed pointer gesture into a step transition.
 *
 * - Requires a predominantly horizontal move past `threshold`; a mostly
 *   vertical gesture is the user scrolling the form, not swiping steps.
 * - Swipe right (deltaX > 0) goes back; swipe left (deltaX < 0) goes forward,
 *   matching the natural "drag the page in the direction you want it to move".
 * - Returns null when the gesture is too small, too vertical, or the target
 *   direction has no step to move to.
 */
export function resolveSwipeAction(
  deltaX: number,
  deltaY: number,
  { canGoBack, canGoNext, threshold = SWIPE_THRESHOLD_PX }: SwipeBounds,
): SwipeAction {
  if (Math.abs(deltaX) < threshold) return null
  // Horizontal must dominate — a tie or vertical-dominant move is a scroll.
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return null

  if (deltaX > 0) return canGoBack ? 'back' : null
  return canGoNext ? 'next' : null
}
