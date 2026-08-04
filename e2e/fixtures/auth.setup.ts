import { test as setup, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createTenant, TEST_PASSWORD } from '../../tests/integration/helpers/fixtures'

export const AUTH_STATE = resolve(process.cwd(), 'e2e/.auth/user.json')
export const TENANT_FILE = resolve(process.cwd(), 'e2e/.auth/tenant.json')

/**
 * Signs in once and persists the session for every authenticated spec.
 *
 * Two things make this less routine than the Playwright docs suggest:
 *
 *  1. Supabase auth cookies are CHUNKED (`sb-<ref>-auth-token.0`, `.1`, …) and
 *     the browser client keeps a copy in localStorage as well. A hand-rolled
 *     fixture that saves cookies alone produces a session that looks present and
 *     silently is not. `context.storageState()` captures cookies *and* per-origin
 *     localStorage, which is why it is used here rather than reading cookies out
 *     by hand — and the smoke spec verifies the restored session really works.
 *
 *  2. The tenant is created fresh against the LOCAL stack, so specs get their own
 *     organisation, users and fixtures instead of sharing a database with anyone.
 *     `createTenant` refuses to run against a *.supabase.co URL.
 */
setup('authenticate and seed a tenant', async ({ page }) => {
  const tenant = await createTenant('e2e')

  mkdirSync(dirname(TENANT_FILE), { recursive: true })
  writeFileSync(
    TENANT_FILE,
    JSON.stringify(
      {
        orgId: tenant.orgId,
        tag: tenant.tag,
        fixtures: tenant.fixtures,
        users: Object.fromEntries(
          Object.entries(tenant.roles).map(([role, h]) => [role, { email: h.email, id: h.userId }]),
        ),
        password: TEST_PASSWORD,
      },
      null,
      2,
    ),
  )

  const owner = tenant.roles.tenant_owner
  await page.goto('/')
  await page.getByLabel(/email/i).fill(owner.email)
  await page.getByLabel(/password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Landing anywhere other than /login means the session took. Asserting on a
  // specific dashboard element would couple this fixture to dashboard markup.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle')

  await page.context().storageState({ path: AUTH_STATE })
})
