import { test, expect } from '@playwright/test'
import { seededTenant } from './fixtures/tenant'
import { serviceClient } from '../tests/integration/helpers/stack'

/**
 * Scheduling a job: the step between a won opportunity and an invoice, and the
 * most demanding form in the CRM. It requires a customer, a technician, a date,
 * an address and a name, and reports each omission as a toast — so a missing
 * field is indistinguishable from a submit that did nothing.
 */
test.describe('CRM job creation', () => {
  const created: string[] = []

  test.afterAll(async () => {
    if (!created.length) return
    await serviceClient().from('jobs').delete().in('id', created)
  })

  test('a scheduled job is persisted to the right organisation', async ({ page }) => {
    const tenant = seededTenant()
    const jobName = `Basement abatement ${Date.now().toString(36)}`

    await page.goto('/jobs/new')

    // CustomerCombobox is a popover, not an inline list: the outer control is a
    // role=combobox button showing the placeholder, and the search box only
    // exists once it is open.
    // A native <select> also reports role=combobox, so target the button element.
    await page.locator('button[role="combobox"]').first().click()
    await page.getByPlaceholder(/search customers/i).fill('Fixture')
    await page.getByRole('option', { name: /Fixture Contact/i }).first().click({ timeout: 30_000 })

    // Technician is a native select, not a Radix one; index 1 skips the
    // placeholder option. The seeded org has a user per role.
    await page.locator('select').first().selectOption({ index: 1 })

    // The date defaults to today, in which case the trigger shows the formatted
    // date rather than "Pick a date". Only open the calendar if it is unset.
    const pickDate = page.getByRole('button', { name: /pick a date/i })
    if (await pickDate.count()) {
      await pickDate.click()
      await page.getByRole('gridcell').filter({ hasText: /^\d+$/ }).first().click()
    }

    await page.getByPlaceholder('123 Main St').fill('44 Basement Lane')
    await page.getByPlaceholder(/kitchen renovation/i).fill(jobName)

    await page.getByRole('button', { name: /^create job$/i }).click()
    await expect(page).not.toHaveURL(/jobs\/new/, { timeout: 30_000 })

    const { data } = await serviceClient()
      .from('jobs')
      .select('id, name, organization_id, customer_id')
      .eq('organization_id', tenant.orgId)
      .eq('name', jobName)

    expect(data ?? [], 'job not found in the database').toHaveLength(1)
    expect(data![0].organization_id).toBe(tenant.orgId)
    expect(data![0].customer_id).toBe(tenant.fixtures.customerId)
    created.push(data![0].id as string)
  })

  test('CONTROL: submitting an empty form creates nothing', async ({ page }) => {
    const tenant = seededTenant()
    const before = await serviceClient()
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenant.orgId)

    await page.goto('/jobs/new')
    await page.getByRole('button', { name: /^create job$/i }).click()
    await expect(page).toHaveURL(/jobs\/new/)

    const after = await serviceClient()
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenant.orgId)
    expect(after.count).toBe(before.count)
  })
})
