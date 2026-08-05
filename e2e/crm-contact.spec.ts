import { test, expect } from '@playwright/test'
import { seededTenant } from './fixtures/tenant'
import { serviceClient } from '../tests/integration/helpers/stack'

/**
 * Creating a contact through the UI: the first step of the CRM spine.
 *
 * One path exercises the modal, react-hook-form validation, an RLS-gated write
 * as a real signed-in user, and the list refresh afterwards. The assertions go
 * further than "it appeared on screen" — the row is read back with the service
 * client to confirm it landed in the signed-in user's organisation, which is the
 * part an optimistic UI update would otherwise fake convincingly.
 */
test.describe('CRM contact creation', () => {
  const created: string[] = []

  test.afterAll(async () => {
    if (!created.length) return
    const svc = serviceClient()
    await svc.from('customers').delete().in('id', created)
  })

  test('a contact created in the UI is persisted to the right organisation', async ({ page }) => {
    const tenant = seededTenant()
    const last = `E2E${Date.now().toString(36)}`
    const fullName = `Wilma ${last}`

    await page.goto('/crm/contacts')
    await page.getByRole('button', { name: /new contact/i }).first().click()

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20_000 })
    await page.locator('#first_name').fill('Wilma')
    await page.locator('#last_name').fill(last)
    await page.locator('#email').fill(`${last.toLowerCase()}@example.test`)

    // Status is a required Radix select with no default; leaving it unset keeps
    // the dialog open on validation and the failure looks like a hung submit.
    await page.locator('#status').click()
    await page.getByRole('option').first().click()

    // A full address is mandatory on a contact. Omitting it produces the same
    // symptom as any other validation failure: the dialog simply stays open.
    await page.locator('#address_line1').fill('9 Prospect Street')
    await page.locator('#city').fill('Denver')
    await page.locator('#state').fill('CO')
    await page.locator('#zip').fill('80211')

    await page.getByRole('button', { name: /create contact/i }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 30_000 })

    // Visible in the list...
    await expect(page.getByText(fullName).filter({ visible: true }).first()).toBeVisible({
      timeout: 30_000,
    })

    // ...and actually in the database, scoped to this org. An optimistic update
    // would satisfy the assertion above on its own.
    const svc = serviceClient()
    const { data } = await svc
      .from('customers')
      .select('id, name, organization_id')
      .eq('organization_id', tenant.orgId)
      .eq('last_name', last)

    expect(data ?? [], 'contact not found in the database').toHaveLength(1)
    expect(data![0].organization_id).toBe(tenant.orgId)
    created.push(data![0].id as string)

    // Survives a reload, so it is not just sitting in the query cache.
    await page.reload()
    await expect(page.getByText(fullName).filter({ visible: true }).first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test('CONTROL: a contact that was never created is absent', async ({ page }) => {
    // Guards the assertions above against a locator loose enough to match
    // anything, or a list that renders every row regardless of filter.
    await page.goto('/crm/contacts')
    await expect(page.getByText('Wilma NEVERCREATED0000')).toHaveCount(0)
  })
})
