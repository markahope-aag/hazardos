import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The app under test. CI starts a Next.js server against the local Supabase
 * stack and points this at it.
 */
export function appUrl(): string {
  return (process.env.APP_TEST_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export interface ApiResponse {
  status: number
  json: Record<string, unknown> | null
  text: string
  headers: Headers
}

export async function apiCall(
  method: string,
  path: string,
  opts: { key?: string; body?: unknown; headers?: Record<string, string>; rawBody?: string } = {},
): Promise<ApiResponse> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...opts.headers }
  if (opts.key) headers.authorization = `Bearer ${opts.key}`

  const res = await fetch(`${appUrl()}${path}`, {
    method,
    headers,
    body: opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    redirect: 'manual',
  })
  const text = await res.text()
  let json: Record<string, unknown> | null = null
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    /* non-JSON response is fine; callers check `text` */
  }
  return { status: res.status, json, text, headers: res.headers }
}

export const ALL_SCOPES = [
  'customers:read', 'customers:write', 'companies:read', 'companies:write',
  'jobs:read', 'jobs:write', 'invoices:read', 'invoices:write',
  'estimates:read', 'estimates:write',
] as const

/**
 * Mint an API key the way the product would have. The stored row is exactly what
 * a working "create key" button produces — sha256 of the full `hzd_live_…`
 * string, plus its 16-char prefix — so the app still validates hash, prefix,
 * scopes, active flag and quota. Nothing in the auth path is short-circuited.
 */
export async function mintApiKey(
  svc: SupabaseClient,
  organizationId: string,
  opts: { scopes?: readonly string[]; rateLimit?: number; isActive?: boolean; label?: string } = {},
): Promise<{ key: string; id: string }> {
  const key = `hzd_live_${randomBytes(24).toString('base64url')}`
  const { data, error } = await svc
    .from('api_keys')
    .insert({
      organization_id: organizationId,
      name: `integration ${opts.label ?? 'key'} ${randomBytes(3).toString('hex')}`,
      key_prefix: key.substring(0, 16),
      key_hash: createHash('sha256').update(key).digest('hex'),
      scopes: opts.scopes ?? ALL_SCOPES,
      // High by default so the per-key hourly quota never masks an unrelated test.
      rate_limit: opts.rateLimit ?? 100000,
      rate_limit_count: 0,
      rate_limit_reset_at: new Date(Date.now() + 3600_000).toISOString(),
      is_active: opts.isActive ?? true,
    })
    .select('id')
    .single()

  if (error) throw new Error(`could not mint API key: ${error.message}`)
  return { key, id: (data as { id: string }).id }
}

/** Poll until the app answers, so tests don't race a cold Next.js start. */
export async function waitForApp(timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastErr = ''
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${appUrl()}/api/v1/customers`, { redirect: 'manual' })
      // 401 is the healthy answer here: the route is up and demanding a key.
      if (res.status > 0) return
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`app at ${appUrl()} never became reachable: ${lastErr}`)
}
