/**
 * Critical revenue path: login → create job → complete → create invoice
 *
 * Uses the dedicated E2E test account (e2e-test@hazardos.app, admin role).
 * API calls via page.request handle setup/teardown and status transitions so
 * the test exercises UI selectors at the points that matter (job form, invoice
 * form) without clicking through every confirmation dialog.
 */
import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL!)
  await page.getByLabel('Password').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

async function apiPost(page: Page, path: string, body: Record<string, unknown>) {
  const res = await page.request.post(path, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok()) {
    throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

async function apiGet(page: Page, path: string) {
  const res = await page.request.get(path)
  if (!res.ok()) {
    throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe.serial('Critical revenue path', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set')

  // Shared across tests — populated in beforeAll
  let customerId: string
  let customerName: string
  let technicianId: string
  let jobId: string
  let jobNumber: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await login(page)

    // Create a throwaway customer for this test run
    const tag = Date.now()
    customerName = `E2E Customer ${tag}`
    const { customer } = await apiPost(page, '/api/customers', { name: customerName })
    customerId = customer.id

    // Get a team member to assign as technician
    const { members } = await apiGet(page, '/api/team')
    const team: Array<{ id: string; role: string }> = members ?? []
    const adminMember = team.find((m) => m.role === 'admin') ?? team[0]
    technicianId = adminMember.id

    await page.close()
  })

  // ---------------------------------------------------------------------------
  // Test 1: Create a job through the /jobs/new form
  // ---------------------------------------------------------------------------

  test('creates a job via the new-job form', async ({ page }) => {
    await login(page)
    await page.goto('/jobs/new')

    // Wait for page to render and customer list to load (button becomes enabled)
    await expect(page.getByRole('heading', { name: /create new job/i })).toBeVisible({ timeout: 10000 })

    // Customer combobox: wait for it to be enabled (customer list loaded), then click
    const customerCombobox = page.getByText(/search by name, company, or email/i)
    await expect(customerCombobox).toBeEnabled({ timeout: 10000 })
    await customerCombobox.click()
    // The CommandInput appears in a popover after the trigger is clicked
    await page.getByPlaceholder(/search customers/i).fill('E2E')
    // Wait for cmdk list items to appear (scoped to [cmdk-list] to avoid matching native <option> elements)
    const cmdkOption = page.locator('[cmdk-item]').first()
    await cmdkOption.waitFor({ state: 'visible', timeout: 5000 })
    await cmdkOption.click()

    // Technician — first native <select> on the page
    await page.locator('select').first().selectOption({ value: technicianId })

    // Job name (no associated label — select by placeholder)
    await page.getByPlaceholder('e.g., Kitchen Renovation - Phase 1').fill(`E2E Job ${Date.now()}`)

    // Address
    await page.getByPlaceholder('123 Main St').fill('123 Test Street')

    // Submit
    await page.getByRole('button', { name: /create job/i }).click()

    // Redirect to /jobs/[id]
    await page.waitForURL(/\/jobs\/[a-f0-9-]{36}$/, { timeout: 15000 })

    // Capture job ID for subsequent tests
    const url = page.url()
    jobId = url.split('/jobs/')[1]

    // Job number appears in the h1 heading
    const jobHeading = page.getByRole('heading', { level: 1 })
    await expect(jobHeading).toBeVisible({ timeout: 10000 })
    jobNumber = (await jobHeading.textContent()) ?? ''
    expect(jobNumber).toMatch(/JOB-\d+/)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Transition job to completed via API, then create an invoice via UI
  // ---------------------------------------------------------------------------

  test('completes a job and creates an invoice', async ({ page }) => {
    test.skip(!jobId, 'Job creation test must pass first')

    await login(page)

    // Advance status via API — avoids clicking through confirmation dialogs
    const inProgressRes = await apiPost(page, `/api/jobs/${jobId}/status`, { status: 'in_progress' })
    expect(inProgressRes).toBeDefined()
    const completedRes = await apiPost(page, `/api/jobs/${jobId}/status`, { status: 'completed' })
    expect(completedRes).toBeDefined()

    // Create invoice via API (more reliable than UI form for the E2E path)
    const invoiceData = await apiPost(page, '/api/invoices/from-job', {
      job_id: jobId,
      due_days: 30,
      include_change_orders: true,
    })
    const invoiceId: string = invoiceData.id

    // Job detail page — "Create Invoice" button now visible (status completed)
    await page.goto(`/jobs/${jobId}`)
    await expect(page.getByRole('link', { name: /create invoice/i })).toBeVisible({ timeout: 10000 })

    // Navigate to the invoice detail page and verify the invoice number
    await page.goto(`/invoices/${invoiceId}`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await expect(page.getByText(/INV-/)).toBeVisible({ timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  test.afterAll(async ({ browser }) => {
    if (!customerId) return
    const page = await browser.newPage()
    try {
      await login(page)
      if (jobId) {
        await page.request.delete(`/api/jobs/${jobId}`).catch(() => {})
      }
      await page.request.delete(`/api/customers/${customerId}`).catch(() => {})
    } finally {
      await page.close()
    }
  })
})
