'use client'

import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

/**
 * The state to pre-select on any address form, taken from the organization's
 * own address.
 *
 * Gina asked for this as "ANYWHERE there is a state, it should default to WI".
 * Hardcoding WI would have been client-shaped: AHS is the first tenant, not
 * the specification. Reading it from the organization gives AHS their WI and
 * gives the next tenant theirs, with no configuration to remember.
 *
 * Returns an empty string when the organization has no state set, so callers
 * can treat it as "no default" without special-casing null. Normalized to the
 * two-letter uppercase form the address forms use.
 */
export function useOrgDefaultState(): string {
  const { organization } = useMultiTenantAuth()
  const raw = organization?.state?.trim() ?? ''
  // Anything that isn't already a two-letter code is left out rather than
  // truncated: turning "Wisconsin" into "WI" is a guess, and silently
  // pre-filling the wrong state on a regulatory form is worse than blank.
  return /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : ''
}
