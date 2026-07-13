import { describe, it, expect } from 'vitest'
import { consentCategoryFor, requiresMarketingConsent } from '@/lib/utils/sms-consent'
import type { SmsMessageType } from '@/types/sms'

describe('sms-consent classifier', () => {
  const transactional: SmsMessageType[] = [
    'appointment_reminder',
    'job_status',
    'lead_notification',
    'payment_reminder',
    'estimate_follow_up',
    'invoice',
    'general',
  ]

  it('classifies marketing messages as requiring marketing consent', () => {
    expect(consentCategoryFor('marketing')).toBe('marketing')
    expect(requiresMarketingConsent('marketing')).toBe(true)
  })

  it.each(transactional)('classifies %s as transactional', (type) => {
    expect(consentCategoryFor(type)).toBe('transactional')
    expect(requiresMarketingConsent(type)).toBe(false)
  })
})
