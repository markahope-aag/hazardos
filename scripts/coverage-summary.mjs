import { readFileSync } from 'node:fs'

const data = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'))

const buckets = {
  app: { c: 0, t: 0 },
  components: { c: 0, t: 0 },
  lib: { c: 0, t: 0 },
  types: { c: 0, t: 0 },
}

for (const [file, metrics] of Object.entries(data)) {
  if (file === 'total') continue
  const normalized = file.replace(/\\/g, '/')
  for (const prefix of Object.keys(buckets)) {
    if (normalized.includes(`/${prefix}/`)) {
      buckets[prefix].c += metrics.lines.covered
      buckets[prefix].t += metrics.lines.total
      break
    }
  }
}

const total = data.total
console.log('Overall coverage:')
console.log('  Lines:      ', total.lines.pct + '%', `(${total.lines.covered}/${total.lines.total})`)
console.log('  Statements: ', total.statements.pct + '%', `(${total.statements.covered}/${total.statements.total})`)
console.log('  Functions:  ', total.functions.pct + '%', `(${total.functions.covered}/${total.functions.total})`)
console.log('  Branches:   ', total.branches.pct + '%', `(${total.branches.covered}/${total.branches.total})`)

console.log('\nBy top-level directory (lines):')
for (const [name, bucket] of Object.entries(buckets)) {
  const pct = bucket.t ? ((bucket.c / bucket.t) * 100).toFixed(1) : '—'
  console.log(' ', name.padEnd(12), pct + '%', `(${bucket.c}/${bucket.t})`)
}
