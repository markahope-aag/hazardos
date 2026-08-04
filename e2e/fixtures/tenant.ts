import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface SeededTenant {
  orgId: string
  tag: string
  fixtures: {
    customerId: string
    opportunityId: string
    stageId: string
    estimateId: string
    lineItemId: string
    jobId: string
    voidInvoiceId: string
  }
  users: Record<string, { email: string; id: string }>
  password: string
}

let cached: SeededTenant | null = null

/**
 * The organisation created by auth.setup.ts. Specs use this to assert against
 * data they know exists, rather than whatever happens to be in the database.
 */
export function seededTenant(): SeededTenant {
  if (cached) return cached
  const file = resolve(process.cwd(), 'e2e/.auth/tenant.json')
  try {
    cached = JSON.parse(readFileSync(file, 'utf8')) as SeededTenant
    return cached
  } catch {
    throw new Error(
      `no seeded tenant at ${file} — the "setup" project must run first ` +
        '(it is wired as a dependency in playwright.config.ts)',
    )
  }
}
