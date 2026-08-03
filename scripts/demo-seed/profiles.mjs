/**
 * Tenant identities for the seeder.
 *
 * The business fixture data in data.mjs is shared across every tenant — only
 * the things that make a tenant *itself* (the organisation row, the login
 * addresses, the shared password) vary. Pick one with `--profile=<key>`.
 *
 * `summit` is the default so the existing client demo keeps its stable sign-in
 * details when the seeder is run the way it always has been.
 */

// Organisations the seeder must never wipe, whatever a profile claims. Acme is
// the QA rig — its fixtures and role-permutation logins are load-bearing.
export const PROTECTED_ORG_IDS = new Set([
  '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f', // Acme Remediation
])

export const PROFILES = {
  summit: {
    label: 'client demo',
    password: 'SummitDemo-2026!',
    // Vanity domain that receives no mail. Fine here: we drive this tenant
    // ourselves and never need a password reset to arrive.
    teamEmail: (m) => `${m.first}.${m.last}`.toLowerCase() + '@summitabatement.com',
    org: {
      name: 'Summit Abatement Services',
      address: '4820 Pecos Street, Unit B',
      city: 'Denver',
      state: 'CO',
      zip: '80211',
      phone: '(303) 555-0188',
      email: 'mark.hope+demo.summit@asymmetric.pro',
      website: 'https://summitabatement.com',
      license_number: 'CO-ACA-2291',
      timezone: 'America/Denver',
      status: 'active',
      subscription_tier: 'professional',
    },
  },

  ahs: {
    label: 'AHS evaluation sandbox — disposable',
    password: 'AhsPreview-2026!',
    // Plus-aliases on a mailbox we control, so invites, password resets and
    // notification mail land somewhere readable. The client never needs inbox
    // access to sign in: accounts are created pre-confirmed.
    teamEmail: (m) => `mark.hope+ahs-${m.slot}@asymmetric.pro`,
    org: {
      // PLACEHOLDERS — correct these to AHS's real details before handover.
      name: 'AHS-Test',
      address: '1 Placeholder Way',
      city: 'Denver',
      state: 'CO',
      zip: '80211',
      phone: '(303) 555-0100',
      email: 'mark.hope+ahs.test@asymmetric.pro',
      website: 'https://example.com',
      license_number: 'PENDING',
      timezone: 'America/Denver',
      status: 'trial',
      subscription_tier: 'trial',
    },
  },
}

export function resolveProfile(argv) {
  const flag = argv.find((a) => a.startsWith('--profile='))
  const key = flag ? flag.slice('--profile='.length) : 'summit'
  const profile = PROFILES[key]

  if (!profile) {
    const known = Object.keys(PROFILES).join(', ')
    throw new Error(`unknown profile "${key}" — expected one of: ${known}`)
  }
  return { key, ...profile }
}
