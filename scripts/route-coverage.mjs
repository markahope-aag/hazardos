import { readFileSync } from 'node:fs'

const data = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'))

const routes = []
for (const [file, metrics] of Object.entries(data)) {
  if (file === 'total') continue
  const normalized = file.replace(/\\/g, '/')
  if (!normalized.includes('/app/')) continue
  if (!/route\.ts$|page\.tsx$/.test(normalized)) continue
  routes.push({
    file: normalized.split('/app/')[1],
    kind: normalized.endsWith('route.ts') ? 'api' : 'page',
    lines: metrics.lines,
    statements: metrics.statements,
    functions: metrics.functions,
    branches: metrics.branches,
  })
}

// Tally
const total = { api: { c: 0, t: 0, files: 0 }, page: { c: 0, t: 0, files: 0 } }
for (const r of routes) {
  total[r.kind].c += r.lines.covered
  total[r.kind].t += r.lines.total
  total[r.kind].files += 1
}
for (const [k, v] of Object.entries(total)) {
  v.pct = v.t ? ((v.c / v.t) * 100).toFixed(1) : '—'
}

console.log('=== Route coverage summary ===\n')
console.log(`API routes (route.ts):  ${total.api.pct}% lines  (${total.api.c}/${total.api.t} across ${total.api.files} files)`)
console.log(`Page routes (page.tsx): ${total.page.pct}% lines  (${total.page.c}/${total.page.t} across ${total.page.files} files)\n`)

// Fully uncovered
const uncoveredApi = routes.filter((r) => r.kind === 'api' && r.lines.pct === 0 && r.lines.total > 0)
const uncoveredPage = routes.filter((r) => r.kind === 'page' && r.lines.pct === 0 && r.lines.total > 0)

console.log(`API routes with 0% coverage: ${uncoveredApi.length}`)
uncoveredApi
  .sort((a, b) => b.lines.total - a.lines.total)
  .slice(0, 30)
  .forEach((r) => {
    console.log(`  ${String(r.lines.total).padStart(4)} lines  ${r.file}`)
  })

console.log(`\nPage routes with 0% coverage: ${uncoveredPage.length}`)
uncoveredPage
  .sort((a, b) => b.lines.total - a.lines.total)
  .slice(0, 30)
  .forEach((r) => {
    console.log(`  ${String(r.lines.total).padStart(4)} lines  ${r.file}`)
  })

// Partially covered, below 70%
const partial = routes.filter((r) => r.lines.pct > 0 && r.lines.pct < 70 && r.lines.total >= 20)
console.log(`\nRoutes below 70% but non-zero (20+ lines, top 20 by uncovered lines):`)
partial
  .map((r) => ({ ...r, gap: r.lines.total - r.lines.covered }))
  .sort((a, b) => b.gap - a.gap)
  .slice(0, 20)
  .forEach((r) => {
    console.log(
      `  ${r.lines.pct.toFixed(0).padStart(3)}%  ${String(r.gap).padStart(4)} uncovered  ${r.file}`,
    )
  })
