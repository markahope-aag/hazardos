import { test, expect } from '@playwright/test'
import { seededTenant } from './fixtures/tenant'
import { serviceClient } from '../tests/integration/helpers/stack'

/**
 * The third step of the CRM spine: raising an estimate.
 *
 * Estimates can be generated from a survey or created standalone; this covers
 * the standalone path, which is the one that works without a completed survey
 * and so is the one a user reaches first.
 */
test.describe('CRM estimate creation', () => {
  const created: string[] = []

  test.afterAll(async () => {
    if (!created.length) return
    await serviceClient().from('estimates').delete().in('id', created)
  })

  test('a draft estimate is persisted to the right organisation', async ({ page }) => {
    const tenant = seededTenant()
    const projectName = `Warehouse strip-out ${Date.now().toString(36)}`

    await page.goto('/estimates/new')
    // The page opens in survey mode; the standalone form is behind this toggle.
    await page.getByRole('button', { name: /^standalone$/i }).first().click()
    await page.locator('#project-name').fill(projectName)
    await page.getByRole('button', { name: /create draft estimate/i }).click()

    // Left the form, so the create was accepted.
    await expect(page).not.toHaveURL(/estimates\/new/, { timeout: 30_000 })

    const { data } = await serviceClient()
      .from('estimates')
      .select('id, project_name, organization_id, status')
      .eq('organization_id', tenant.orgId)
      .eq('project_name', projectName)

    expect(data ?? [], 'estimate not found in the database').toHaveLength(1)
    expect(data![0].organization_id).toBe(tenant.orgId)
    created.push(data![0].id as string)
  })

  test('CONTROL: the create button is disabled without a project name', async ({ page }) => {
    // Proves the test above is not passing on a form that would accept anything.
    await page.goto('/estimates/new')
    // The page opens in survey mode; the standalone form is behind this toggle.
    await page.getByRole('button', { name: /^standalone$/i }).first().click()
    await expect(page.getByRole('button', { name: /create draft estimate/i })).toBeDisabled()

    await page.locator('#project-name').fill('Now it has a name')
    await expect(page.getByRole('button', { name: /create draft estimate/i })).toBeEnabled()
  })
})
