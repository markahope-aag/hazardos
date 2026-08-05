import { test, expect } from '@playwright/test'
import { seededTenant } from './fixtures/tenant'
import { serviceClient } from '../tests/integration/helpers/stack'

/**
 * The second step of the CRM spine: turning a contact into an opportunity.
 *
 * Like the contact spec, this checks the row actually landed in the signed-in
 * user's organisation rather than trusting the screen. The form validates three
 * things (a contact, a name, a pipeline stage) and reports each as a toast, so a
 * missing one looks like a submit that silently did nothing.
 */
test.describe('CRM opportunity creation', () => {
  const created: string[] = []

  test.afterAll(async () => {
    if (!created.length) return
    await serviceClient().from('opportunities').delete().in('id', created)
  })

  test('an opportunity created in the UI is persisted to the right organisation', async ({
    page,
  }) => {
    const tenant = seededTenant()
    const name = `Roof abatement ${Date.now().toString(36)}`

    await page.goto('/crm/opportunities/new')

    // Results only render once the user types — the form deliberately does not
    // open with every contact listed.
    await page.getByPlaceholder(/start typing a name/i).fill('Fixture')
    await page
      .getByRole('button', { name: /Fixture Contact/i })
      .first()
      .click({ timeout: 30_000 })

    // The label has no htmlFor, so getByLabel cannot associate it with the input.
    await page.getByPlaceholder(/auto-generate/i).fill(name)

    // Pipeline stage is a required Radix select. The seeded org gets its default
    // stages from an AFTER INSERT trigger on organizations, so there is always
    // at least one to choose.
    await page.getByText('Select a stage').click()
    await page.getByRole('option').first().click()

    await page.getByRole('button', { name: /^create opportunity$/i }).click()

    // Left the form, so the submit was accepted rather than rejected by a toast.
    await expect(page).not.toHaveURL(/opportunities\/new/, { timeout: 30_000 })

    const { data } = await serviceClient()
      .from('opportunities')
      .select('id, name, organization_id')
      .eq('organization_id', tenant.orgId)
      .eq('name', name)

    expect(data ?? [], 'opportunity not found in the database').toHaveLength(1)
    expect(data![0].organization_id).toBe(tenant.orgId)
    created.push(data![0].id as string)
  })

  test('CONTROL: submitting an empty form does not create anything', async ({ page }) => {
    // Proves the assertion above is meaningful: the form genuinely refuses
    // incomplete input rather than accepting whatever it is given.
    const tenant = seededTenant()
    const before = await serviceClient()
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenant.orgId)

    await page.goto('/crm/opportunities/new')
    await page.getByRole('button', { name: /^create opportunity$/i }).click()

    // Still on the form.
    await expect(page).toHaveURL(/opportunities\/new/)

    const after = await serviceClient()
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenant.orgId)
    expect(after.count).toBe(before.count)
  })
})
