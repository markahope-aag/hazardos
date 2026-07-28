#!/usr/bin/env node
/**
 * Verifies a route's behaviour on the deployed site as a signed-in user.
 *
 * Mints the @supabase/ssr auth cookie from a real password sign-in so the
 * request goes through proxy.ts exactly as a browser's would, then follows
 * the response without auto-redirecting so the Location header is visible.
 *
 * Usage: node scripts/check-live-redirect.mjs [path...]
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function readEnv() {
  const raw = readFileSync('.env.local', 'utf8')
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const env = readEnv()
const BASE = env.NEXT_PUBLIC_APP_URL ?? 'https://hazardos.app'
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]

const EMAIL = process.env.DEMO_EMAIL ?? 'dana.whitfield@summitabatement.com'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'SummitDemo-2026!'

const paths = process.argv.slice(2)
if (paths.length === 0) paths.push('/jobs', '/crm/jobs', '/customers')

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const { data, error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
})
if (error) {
  console.error(`sign-in failed for ${EMAIL}: ${error.message}`)
  process.exit(1)
}

// @supabase/ssr stores the whole session as a base64- prefixed JSON blob,
// chunked across .0/.1/... cookies when it exceeds the 3180-byte limit.
const cookieName = `sb-${projectRef}-auth-token`
const encoded = 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64')

const CHUNK = 3180
const cookies = []
if (encoded.length <= CHUNK) {
  cookies.push(`${cookieName}=${encoded}`)
} else {
  for (let i = 0, n = 0; i < encoded.length; i += CHUNK, n++) {
    cookies.push(`${cookieName}.${n}=${encoded.slice(i, i + CHUNK)}`)
  }
}
const cookieHeader = cookies.join('; ')

console.log(`Signed in as ${EMAIL}`)
console.log(`Against ${BASE} (${cookies.length} cookie chunk${cookies.length > 1 ? 's' : ''})\n`)

for (const path of paths) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: 'manual',
    headers: { cookie: cookieHeader },
  })
  const location = res.headers.get('location')
  console.log(`  ${path.padEnd(16)} ${res.status}${location ? `  ->  ${location}` : ''}`)
}
