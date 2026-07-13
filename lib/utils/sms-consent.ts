import type { SmsMessageType } from '@/types/sms'

export type ConsentCategory = 'transactional' | 'marketing'

/**
 * Message types that count as promotional/marketing and therefore require
 * EXPRESS marketing consent (customers.sms_marketing_consent) rather than the
 * implied transactional consent (customers.sms_opt_in).
 *
 * Everything else — appointment reminders, job status, invoices, payment
 * reminders, estimate follow-ups on an active quote, lead confirmations, and
 * 1:1 replies — is transactional/informational: it's about work the customer
 * already engaged us for, so it rides on transactional consent.
 */
const MARKETING_MESSAGE_TYPES: ReadonlySet<SmsMessageType> = new Set<SmsMessageType>([
  'marketing',
])

export function consentCategoryFor(messageType: SmsMessageType): ConsentCategory {
  return MARKETING_MESSAGE_TYPES.has(messageType) ? 'marketing' : 'transactional'
}

export function requiresMarketingConsent(messageType: SmsMessageType): boolean {
  return consentCategoryFor(messageType) === 'marketing'
}
