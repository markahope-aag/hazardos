import { test, expect } from '@playwright/test'
import { seededTenant } from './fixtures/tenant'
import { serviceClient } from '../tests/integration/helpers/stack'

/**
 * Browser coverage for Gina Richardson's feedback (office manager at AHS):
 *
 *  1. The OPP project description has to arrive carrying a quantity and a
 *     material type, worded the way the proposal words it.
 *  2. "Lead" on crew assignment means too many things at AHS. It now reads
 *     "Supervisor", and the supervisor is picked from the whole team rather
 *     than only from the people already checked off.
 *
 * Serial: several of these mutate job_crew for the seeded job and one asserts
 * on the resulting set, so overlapping runs would read each other's writes.
 */
test.describe.configure({ mode: 'serial' })

test.describe('Gina feedback: crew supervisor', () => {
  test.beforeEach(async () => {
    const tenant = seededTenant()
    await serviceClient().from('job_crew').delete().eq('job_id', tenant.fixtures.jobId)
  })

  test.afterAll(async () => {
    const tenant = seededTenant()
    await serviceClient().from('job_crew').delete().eq('job_id', tenant.fixtures.jobId)
  })

  test('UI4/UI5: reads Supervisor, and lists the whole team in groups', async ({ page }) => {
    const tenant = seededTenant()
    await page.goto(`/jobs/${tenant.fixtures.jobId}`)
    await page.getByRole('tab', { name: /crew/i }).click()
    await page.getByRole('button', { name: /assign crew/i }).click()

    // UI4: the label Gina asked about.
    await expect(page.getByText('Supervisor (optional)')).toBeVisible()
    await expect(page.getByText(/crew lead/i)).toHaveCount(0)

    // UI5: the list is populated with nobody checked off, which is the point
    // of the change. Their 4 supervisors stay one click away.
    await page.getByRole('combobox', { name: /supervisor/i }).click()
    const options = page.getByRole('option')
    await expect(options.filter({ hasText: /^No supervisor$/ })).toHaveCount(1)
    expect(await options.count(), 'team members listed beyond "No supervisor"').toBeGreaterThan(1)
    await expect(page.getByText('Anyone else on the team')).toBeVisible()
  })

  test('UI6: an unchecked supervisor gets assigned, with the supervisor role', async ({ page }) => {
    const tenant = seededTenant()
    const svc = serviceClient()

    await page.goto(`/jobs/${tenant.fixtures.jobId}`)
    await page.getByRole('tab', { name: /crew/i }).click()
    await page.getByRole('button', { name: /assign crew/i }).click()

    // Check one person, then name a different person as supervisor.
    //
    // Click the LABEL, not the checkbox inside it. Radix renders the checkbox
    // as a <button>, which is a labelable element, so a click landing on the
    // button also bubbles to the wrapping <label>, which forwards a second
    // click straight back to it. The row toggles on and immediately off, and
    // the dialog looks untouched. The "N selected" assertion below is what
    // separates that harness mistake from an app defect.
    await page.getByRole('group', { name: /crew members/i }).locator('label').first().click()
    await expect(page.getByText('1 selected')).toBeVisible()

    await page.getByRole('combobox', { name: /supervisor/i }).click()
    const supervisorOption = page.getByRole('option').filter({ hasNotText: /^No supervisor$/ }).last()
    const supervisorName = ((await supervisorOption.textContent()) ?? '').trim()
    await supervisorOption.click()

    await page.getByRole('button', { name: /^assign/i }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 })

    const { data: rows } = await svc
      .from('job_crew')
      .select('profile_id, role, is_lead, profile:profiles(first_name, last_name)')
      .eq('job_id', tenant.fixtures.jobId)

    expect(rows ?? [], 'checked member plus the named supervisor').toHaveLength(2)

    const supervisor = (rows ?? []).find((r) => r.is_lead)
    expect(supervisor, 'exactly one row carries is_lead').toBeTruthy()
    expect(supervisor!.role).toBe('supervisor')

    const profile = Array.isArray(supervisor!.profile) ? supervisor!.profile[0] : supervisor!.profile
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    expect(supervisorName).toContain(fullName)
  })

  test('UI7: the roster labels the supervisor instead of a bare crown', async ({ page }) => {
    const tenant = seededTenant()
    await serviceClient().from('job_crew').insert({
      job_id: tenant.fixtures.jobId,
      profile_id: tenant.users.tenant_owner.id,
      role: 'supervisor',
      is_lead: true,
    })

    await page.goto(`/jobs/${tenant.fixtures.jobId}`)
    await page.getByRole('tab', { name: /crew/i }).click()

    await expect(page.getByText('Supervisor', { exact: true }).first()).toBeVisible()
  })
})

test.describe('Gina feedback: work order', () => {
  let workOrderId: string | null = null

  test.afterAll(async () => {
    if (workOrderId) await serviceClient().from('work_orders').delete().eq('id', workOrderId)
  })

  test('UI12: generating a work order reports success, not an error', async ({ page }) => {
    const tenant = seededTenant()
    const consoleErrors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })

    await page.goto(`/jobs/${tenant.fixtures.jobId}`)
    await page.getByRole('tab', { name: /work order/i }).click()

    // Capture the API exchange. Gina reported an error alongside a work order
    // that existed, so the status and body of this call are the evidence.
    const postResponse = page.waitForResponse(
      (r) => r.url().includes('/api/work-orders') && r.request().method() === 'POST',
      { timeout: 60_000 },
    )
    await page.getByRole('button', { name: /generate work order/i }).click()

    const response = await postResponse
    const status = response.status()
    const body = await response.text().catch(() => '<unreadable>')
    console.log(`POST /api/work-orders -> ${status} ${body.slice(0, 400)}`)
    expect(status, `generate returned ${status}: ${body.slice(0, 300)}`).toBe(201)

    // Gina's report was an error message alongside a work order that existed
    // anyway, so assert both halves.
    await expect(page.getByText(/could not generate work order/i)).toHaveCount(0, { timeout: 30_000 })
    await expect(page.getByText(/failed to/i)).toHaveCount(0)

    const { data: rows } = await serviceClient()
      .from('work_orders')
      .select('id, work_order_number, status')
      .eq('job_id', tenant.fixtures.jobId)
      .order('created_at', { ascending: false })

    expect(rows?.length ?? 0, 'a work order row exists after generate').toBeGreaterThan(0)
    workOrderId = rows![0].id

    if (consoleErrors.length) {
      console.log('CONSOLE ERRORS DURING GENERATE:\n' + consoleErrors.join('\n'))
    }
  })

  test('UI8/UI9: crew row says Supervisor and picks people from a dropdown', async ({ page }) => {
    expect(workOrderId, 'UI12 must run first to create the work order').toBeTruthy()
    await page.goto(`/work-orders/${workOrderId}`)

    // Scope to the Crew card. Every editable list on this page renders an
    // identical "Add" button, so an unscoped locator picks whichever card
    // happens to come first in the DOM.
    const crewCard = page
      .locator('div.rounded-lg.border')
      .filter({ has: page.getByText(/^Crew \(\d+\)$/) })
      .last()
    await expect(crewCard).toBeVisible({ timeout: 60_000 })

    // The Add handler is wired at hydration, and under a loaded dev server the
    // first click can land before that and be swallowed. Retry until a row
    // actually appears, guarding on the count so a retry cannot add a second.
    const addCrew = crewCard.getByRole('button', { name: 'Add', exact: true })
    await expect(async () => {
      if ((await crewCard.getByRole('combobox').count()) === 0) await addCrew.click()
      await expect(crewCard.getByRole('combobox').first()).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 45_000 })

    // UI8
    await expect(crewCard.getByText('Supervisor')).toBeVisible()
    await expect(crewCard.getByText('Lead', { exact: true })).toHaveCount(0)

    // UI9: the name field is a picker with a free-text escape hatch for subs.
    await crewCard.getByRole('combobox').first().click()
    const custom = page.getByRole('option', { name: /someone else/i })
    await expect(custom).toBeVisible()
    await custom.click()
    await expect(crewCard.getByPlaceholder('Name')).toBeVisible()

    // UI10: a typed custom name survives the save.
    //
    // Assert on the stored snapshot, not on page text. A draft work order
    // renders the crew row as an editor, so the name lives in an input's
    // value and never appears as text for getByText to find.
    await crewCard.getByPlaceholder('Name').fill('Ramirez Subcontracting')

    const patchResponse = page.waitForResponse(
      (r) => r.url().includes('/api/work-orders/') && r.request().method() === 'PATCH',
      { timeout: 60_000 },
    )
    await page.getByRole('button', { name: /save changes/i }).click()
    const patch = await patchResponse
    const patchBody = await patch.text().catch(() => '<unreadable>')
    expect(patch.status(), `save returned ${patch.status()}: ${patchBody.slice(0, 300)}`).toBe(200)

    const { data: saved } = await serviceClient()
      .from('work_orders')
      .select('snapshot')
      .eq('id', workOrderId!)
      .single()

    const savedCrew = (saved?.snapshot as { crew?: Array<{ name: string; profile_id: string | null }> })?.crew ?? []
    expect(savedCrew.map((c) => c.name)).toContain('Ramirez Subcontracting')
    expect(
      savedCrew.find((c) => c.name === 'Ramirez Subcontracting')?.profile_id,
      'a typed name is not tied to a team member',
    ).toBeNull()
  })
})

test.describe('Gina feedback: OPP project description', () => {
  test('UI1/UI2: pre-fills from the estimate and says where it came from', async ({ page }) => {
    const tenant = seededTenant()
    const svc = serviceClient()

    // Give the fixture estimate the wording a real proposal carries, and point
    // the job at it, so the top of the source chain is what gets exercised.
    const scope =
      'Removal and disposal of approximately 225 sq feet of asbestos containing two layers of sheet vinyl in the lower level kitchen.'
    await svc.from('estimates').update({ scope_of_work: scope }).eq('id', tenant.fixtures.estimateId)
    await svc
      .from('jobs')
      .update({ estimate_id: tenant.fixtures.estimateId })
      .eq('id', tenant.fixtures.jobId)

    await page.goto(`/jobs/${tenant.fixtures.jobId}`)
    await page.getByRole('tab', { name: /documents/i }).click()
    await page.getByRole('button', { name: /generate opp/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Project Description')).toBeVisible({ timeout: 30_000 })

    // UI1: the box carries the proposal text, not the old hazard stub.
    const values: string[] = await dialog
      .locator('textarea')
      .evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))

    expect(values.some((v) => v.includes('225 sq feet')), 'proposal scope pre-filled').toBe(true)
    expect(values.some((v) => v.startsWith('Hazards:')), 'no hazard stub').toBe(false)

    // UI2: the hint names the estimate it came from.
    await expect(dialog.getByText(/scope of work on/i)).toBeVisible()
  })
})
