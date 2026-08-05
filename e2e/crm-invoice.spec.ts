import { test, expect } from '@playwright/test'
import { seededTenant } from './fixtures/tenant'
import { serviceClient } from '../tests/integration/helpers/stack'

/**
 * The last step of the CRM spine: raising an invoice.
 *
 * The form requires a customer and nothing else, so this is the shortest write
 * path in the product — which makes it a good check that a minimal create still
 * lands scoped to the right organisation.
 */
// Serial on purpose. fullyParallel runs tests WITHIN a file concurrently, and the
// CONTROL below asserts a row count for this organisation is unchanged — which
// the create test above invalidates if the two overlap. Observed once as a
// one-in-several-runs failure before being pinned down.
test.describe.configure({ mode: 'serial' })

test.describe('CRM invoice creation', () => {
  const created: string[] = []

  test.afterAll(async () => {
    if (!created.length) return
    await serviceClient().from('invoices').delete().in('id', created)
  })

  test('an invoice created in the UI is persisted to the right organisation', async ({ page }) => {
    const tenant = seededTenant()

    const before = await serviceClient()
      .from('invoices')
      .select('id')
      .eq('organization_id', tenant.orgId)
    const knownIds = new Set((before.data ?? []).map((r) => r.id as string))

    await page.goto('/invoices/new')

    // Customer is the only required field; it is a Radix select with no default.
    await page.getByLabel(/select customer/i).click()
    await page.getByRole('option', { name: /Fixture Contact/i }).first().click()

    await page.getByRole('button', { name: /^create invoice$/i }).click()
    await expect(page).not.toHaveURL(/invoices\/new/, { timeout: 30_000 })

    const after = await serviceClient()
      .from('invoices')
      .select('id, organization_id, customer_id')
      .eq('organization_id', tenant.orgId)

    const fresh = (after.data ?? []).filter((r) => !knownIds.has(r.id as string))
    expect(fresh, 'no new invoice found for this organisation').toHaveLength(1)
    expect(fresh[0].organization_id).toBe(tenant.orgId)
    expect(fresh[0].customer_id).toBe(tenant.fixtures.customerId)
    created.push(fresh[0].id as string)
  })

  test('CONTROL: submitting without a customer creates nothing', async ({ page }) => {
    const tenant = seededTenant()
    const before = await serviceClient()
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenant.orgId)

    await page.goto('/invoices/new')
    await page.getByRole('button', { name: /^create invoice$/i }).click()
    await expect(page).toHaveURL(/invoices\/new/)

    const after = await serviceClient()
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenant.orgId)
    expect(after.count).toBe(before.count)
  })
})
