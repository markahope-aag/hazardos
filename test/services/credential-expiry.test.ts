import { describe, it, expect } from 'vitest'
import { daysUntil, thresholdBucket, ALERT_THRESHOLDS } from '@/lib/services/credential-expiry-service'

describe('daysUntil', () => {
  it('counts whole days forward', () => {
    expect(daysUntil('2026-07-01', '2026-07-08')).toBe(7)
    expect(daysUntil('2026-07-01', '2026-07-01')).toBe(0)
  })
  it('is negative for a past date', () => {
    expect(daysUntil('2026-07-01', '2026-06-24')).toBe(-7)
  })
})

describe('thresholdBucket (expiry-alert de-duplication)', () => {
  it('returns null when further out than the widest threshold', () => {
    expect(thresholdBucket(40)).toBeNull()
    expect(thresholdBucket(31)).toBeNull()
  })

  it('maps a credential to the tightest bucket it falls into', () => {
    expect(thresholdBucket(30)).toBe(30)
    expect(thresholdBucket(20)).toBe(30)
    expect(thresholdBucket(14)).toBe(14)
    expect(thresholdBucket(8)).toBe(14)
    expect(thresholdBucket(7)).toBe(7)
    expect(thresholdBucket(3)).toBe(7)
    expect(thresholdBucket(0)).toBe(0)
  })

  it('buckets expired credentials at 0', () => {
    expect(thresholdBucket(-1)).toBe(0)
    expect(thresholdBucket(-100)).toBe(0)
  })

  it('keeps the same bucket across a range (dedup) but changes when it tightens (re-alert)', () => {
    // Same bucket on consecutive days inside 15..30 → one alert (deduped).
    expect(thresholdBucket(28)).toBe(thresholdBucket(20))
    // Crossing into a tighter window yields a different bucket → a new alert.
    expect(thresholdBucket(20)).not.toBe(thresholdBucket(5))
  })

  it('exposes the expected default thresholds', () => {
    expect([...ALERT_THRESHOLDS].sort((a, b) => a - b)).toEqual([0, 7, 14, 30])
  })
})
