import { test, expect } from '@playwright/test'

/**
 * The guide download buttons point at static PDFs under /public/guides.
 *
 * Worth a test because `proxy.ts` matches everything that is not an image
 * extension, so these PDFs go through the auth check rather than being served
 * as plain static assets. Signed out they redirect to /login, which is fine and
 * intended. Signed in they must return the actual file. A route rule, a moved
 * file, or a forgotten `npm run guides` all break this silently, and what the
 * user sees is a login page where their handbook should be.
 */

const GUIDES = [
  { path: '/guides/hazardos-user-guide.pdf', name: 'User Guide' },
  { path: '/guides/hazardos-admin-guide.pdf', name: 'Admin Guide' },
]

for (const guide of GUIDES) {
  test(`${guide.name} downloads as a real PDF for a signed-in user`, async ({ page }) => {
    const response = await page.request.get(guide.path)

    expect(response.status(), `${guide.path} should not redirect a signed-in user`).toBe(200)
    expect(response.headers()['content-type']).toContain('pdf')

    // A login page would also come back 200 on some configurations, so check
    // the magic bytes rather than trusting the status alone.
    const body = await response.body()
    expect(body.subarray(0, 5).toString('utf8')).toBe('%PDF-')
    expect(body.byteLength).toBeGreaterThan(10_000)
  })
}
