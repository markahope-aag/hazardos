import { test } from '@playwright/test'

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe('Debug nav', () => {
  // A group timeout goes through configure(); test.describe's optional second
  // argument is TestDetails ({ tag, annotation }), not a timeout, so passing
  // { timeout } as a trailing argument doesn't type-check.
  test.describe.configure({ timeout: 90000 })
  test.skip(!EMAIL || !PASSWORD, 'creds not set')

  test('check /jobs/new after login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(EMAIL!)
    await page.getByLabel('Password').fill(PASSWORD!)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    console.log('URL after login:', page.url())

    await page.goto('/jobs/new')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000) // Allow client hydration
    console.log('Final URL:', page.url())
    const h1s = await page.locator('h1').allTextContents()
    console.log('h1 elements:', JSON.stringify(h1s))
    const bodyText = await page.locator('body').textContent()
    console.log('Body snippet:', bodyText?.substring(0, 200))
  })
})
