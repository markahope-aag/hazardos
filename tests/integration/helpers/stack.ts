import { execFileSync } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface StackCredentials {
  url: string
  anonKey: string
  serviceRoleKey: string
}

let cached: StackCredentials | null = null

/**
 * Resolve the target stack. Prefers explicit environment variables so CI can point
 * the suite at whatever it started; falls back to asking the CLI, which is what
 * makes `supabase start && npm run test:integration` work with no extra steps.
 *
 * Never point this at production: the suite writes and deletes rows freely.
 */
export function stack(): StackCredentials {
  if (cached) return cached

  const fromEnv = {
    url: process.env.SUPABASE_TEST_URL,
    anonKey: process.env.SUPABASE_TEST_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_TEST_SERVICE_ROLE_KEY,
  }

  if (fromEnv.url && fromEnv.anonKey && fromEnv.serviceRoleKey) {
    cached = fromEnv as StackCredentials
    return cached
  }

  const raw = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  const parsed: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
    if (m) parsed[m[1]] = m[2]
  }

  const url = parsed.API_URL
  const anonKey = parsed.ANON_KEY
  const serviceRoleKey = parsed.SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Could not resolve a local Supabase stack. Run `supabase start`, or set ' +
        'SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY / SUPABASE_TEST_SERVICE_ROLE_KEY.',
    )
  }

  if (/supabase\.co/.test(url)) {
    throw new Error(`Refusing to run destructive integration tests against ${url}`)
  }

  cached = { url, anonKey, serviceRoleKey }
  return cached
}

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } }

/** Service-role client: bypasses RLS. Use it to set up fixtures and to verify. */
export function serviceClient(): SupabaseClient {
  const s = stack()
  return createClient(s.url, s.serviceRoleKey, noPersist)
}

/** Anonymous client: no session at all. */
export function anonClient(): SupabaseClient {
  const s = stack()
  return createClient(s.url, s.anonKey, noPersist)
}

/**
 * A client authenticated as a specific user. PostgREST calls made through it are
 * subject to exactly the policies that would apply to that user in the browser —
 * which is the entire point of this suite.
 */
export async function clientAsUser(email: string, password: string): Promise<SupabaseClient> {
  const s = stack()
  const client = createClient(s.url, s.anonKey, noPersist)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return client
}
