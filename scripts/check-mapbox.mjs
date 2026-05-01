#!/usr/bin/env node
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()

const TOKEN = process.env.MAPBOX_ACCESS_TOKEN

function check(label, ok, detail = '') {
  const mark = ok ? '✓' : '✗'
  console.log(`  ${mark} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

console.log('Mapbox geocoding connectivity check')
console.log()

console.log('Env vars:')
check('MAPBOX_ACCESS_TOKEN set', Boolean(TOKEN))
if (TOKEN) {
  check(
    'Token shape looks like a public token (pk.*)',
    TOKEN.startsWith('pk.'),
    TOKEN.startsWith('sk.')
      ? 'WARNING: this is a secret token, prefer pk.*'
      : TOKEN.slice(0, 5) + '…',
  )
}
console.log()

if (!TOKEN) process.exit(1)

// Reverse-geocode the Chicago Loop — well-known address that should
// resolve cleanly to S Federal St / Chicago / IL / 60604-ish.
const lat = 41.8781
const lng = -87.6298
const url =
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
  `?access_token=${encodeURIComponent(TOKEN)}` +
  `&types=address,place,postcode,region` +
  `&limit=1&language=en&country=us,ca`

console.log('Reverse-geocode round trip (Chicago Loop):')
let response
try {
  response = await fetch(url, { signal: AbortSignal.timeout(8000) })
} catch (err) {
  check('fetch Mapbox', false, err.message ?? String(err))
  process.exit(1)
}

check(`HTTP ${response.status}`, response.ok)
if (!response.ok) {
  const body = await response.text().catch(() => '')
  console.log(`    body sample: ${body.slice(0, 200)}`)
  process.exit(1)
}

const data = await response.json()
const feature = data.features?.[0]
check('At least one feature returned', Boolean(feature))
if (!feature) process.exit(1)

const ctx = feature.context ?? []
const houseNumber = feature.address ?? ''
const street = feature.text ?? ''
const streetAddress = [houseNumber, street].filter(Boolean).join(' ').trim()
const city = ctx.find((c) => c.id?.startsWith('place.'))?.text ?? ''
const region = ctx.find((c) => c.id?.startsWith('region.'))
const state = region?.short_code?.split('-')[1] ?? region?.text ?? ''
const zip = ctx.find((c) => c.id?.startsWith('postcode.'))?.text ?? ''

check('streetAddress parsed', Boolean(streetAddress), streetAddress || '(empty)')
check('city parsed', city.toLowerCase().includes('chicago'), city || '(empty)')
check('state parsed as IL', state === 'IL', state || '(empty)')
check('zip parsed', /^\d{5}/.test(zip), zip || '(empty)')

console.log()
if (process.exitCode === 1) {
  console.log('Mapbox check FAILED.')
} else {
  console.log('Mapbox check OK.')
}
