/**
 * Server-only email template wrapper. Reads the org's appearance
 * settings from the DB and feeds them to the pure renderer in
 * `./template`. Callers (invoice delivery, reminders, ad-hoc compose)
 * use `wrapEmailHtml` instead of building inline HTML so a Settings →
 * Email change propagates to every email type at once.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  renderEmailHtml,
  resolveAppearance,
  type EmailWrapperInput,
} from './template'

export type { EmailAppearance, EmailWrapperInput } from './template'
export { renderEmailHtml, resolveAppearance, DEFAULT_HEADER_COLOR, DEFAULT_ACCENT_COLOR } from './template'

export async function wrapEmailHtml(
  organizationId: string,
  input: EmailWrapperInput,
): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('name, email_header_color, email_accent_color, email_logo_url, email_signature')
    .eq('id', organizationId)
    .single()

  if (error || !data) {
    // Fall back to defaults rather than failing the send — a bad row
    // shouldn't block the customer's invoice from going out.
    return renderEmailHtml(
      resolveAppearance({
        organizationName: 'Your Company',
        email_header_color: null,
        email_accent_color: null,
        email_logo_url: null,
        email_signature: null,
      }),
      input,
    )
  }

  return renderEmailHtml(
    resolveAppearance({
      organizationName: data.name,
      email_header_color: data.email_header_color,
      email_accent_color: data.email_accent_color,
      email_logo_url: data.email_logo_url,
      email_signature: data.email_signature,
    }),
    input,
  )
}
