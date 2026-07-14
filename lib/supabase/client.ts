import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  // Mark the Supabase auth cookies Secure in production (SEC9) so they are
  // only ever sent over HTTPS. Gated to production because local `next dev`
  // serves over plain HTTP, where a Secure cookie would never be stored.
  // httpOnly stays false: @supabase/ssr stores the session in cookies that
  // this browser client must read via document.cookie, so an httpOnly auth
  // cookie would break client-side auth — a documented constraint of the SSR
  // pattern, mitigated by short-lived access tokens + refresh rotation + CSP.
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { secure: process.env.NODE_ENV === 'production' },
  })
}