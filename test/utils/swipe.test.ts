import { describe, it, expect } from 'vitest'
import { resolveSwipeAction, SWIPE_THRESHOLD_PX } from '@/lib/utils/swipe'

const bounds = { canGoBack: true, canGoNext: true }

describe('resolveSwipeAction', () => {
  it('swipes left (negative deltaX) to go forward', () => {
    expect(resolveSwipeAction(-80, 5, bounds)).toBe('next')
  })

  it('swipes right (positive deltaX) to go back', () => {
    expect(resolveSwipeAction(80, 5, bounds)).toBe('back')
  })

  it('ignores horizontal moves below the threshold', () => {
    expect(resolveSwipeAction(SWIPE_THRESHOLD_PX - 1, 0, bounds)).toBeNull()
    expect(resolveSwipeAction(-(SWIPE_THRESHOLD_PX - 1), 0, bounds)).toBeNull()
  })

  it('fires exactly at the threshold', () => {
    expect(resolveSwipeAction(-SWIPE_THRESHOLD_PX, 0, bounds)).toBe('next')
  })

  it('ignores mostly-vertical gestures (a scroll, not a swipe)', () => {
    // Big horizontal travel but even bigger vertical — that's a scroll.
    expect(resolveSwipeAction(60, 200, bounds)).toBeNull()
    expect(resolveSwipeAction(-60, -200, bounds)).toBeNull()
  })

  it('treats an exactly diagonal gesture as a scroll (horizontal must dominate)', () => {
    expect(resolveSwipeAction(80, 80, bounds)).toBeNull()
  })

  it('does not go back from the first section', () => {
    expect(resolveSwipeAction(120, 0, { canGoBack: false, canGoNext: true })).toBeNull()
  })

  it('does not go forward from the last section', () => {
    expect(resolveSwipeAction(-120, 0, { canGoBack: true, canGoNext: false })).toBeNull()
  })

  it('respects a custom threshold', () => {
    expect(resolveSwipeAction(-30, 0, { ...bounds, threshold: 20 })).toBe('next')
    expect(resolveSwipeAction(-30, 0, { ...bounds, threshold: 40 })).toBeNull()
  })

  it('returns null for a stationary tap', () => {
    expect(resolveSwipeAction(0, 0, bounds)).toBeNull()
  })
})
