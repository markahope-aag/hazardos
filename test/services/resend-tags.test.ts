import { describe, it, expect } from 'vitest'
import { buildResendTags, sanitizeTagToken } from '@/lib/services/email/resend-provider'

describe('buildResendTags', () => {
  it('returns undefined for no tags', () => {
    expect(buildResendTags()).toBeUndefined()
    expect(buildResendTags([])).toBeUndefined()
  })

  it('keeps a single tag as name "category" (backward compatible)', () => {
    expect(buildResendTags(['invoice'])).toEqual([{ name: 'category', value: 'invoice' }])
  })

  it('gives multiple tags UNIQUE names so Resend does not reject them', () => {
    // The bug: every tag became name:"category" -> "The `category` tag is
    // duplicated." These are the exact tags that failed in production.
    const tags = buildResendTags(['notification', 'job_assigned'])
    expect(tags).toEqual([
      { name: 'category', value: 'notification' },
      { name: 'category_1', value: 'job_assigned' },
    ])
    const names = tags!.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length) // all unique
  })

  it('sanitizes values to Resend allowed charset', () => {
    expect(sanitizeTagToken('lead notification!')).toBe('lead_notification_')
    expect(sanitizeTagToken('a/b.c')).toBe('a_b_c')
  })

  it('never emits an empty value', () => {
    expect(sanitizeTagToken('')).toBe('tag')
    expect(sanitizeTagToken('***')).toBe('___')
  })
})
