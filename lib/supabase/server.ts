import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Secure cookie defaults
const secureCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your environment configuration.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            const secureOptions = { ...secureCookieOptions, ...options }
            cookieStore.set({ name, value, ...secureOptions })
          } catch (_error) {
            // Handle error - cookies can't be set in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            const secureOptions = { ...secureCookieOptions, ...options }
            cookieStore.set({ name, value: '', ...secureOptions })
          } catch (_error) {
            // Handle error - cookies can't be set in Server Components
          }
        },
      },
    }
  )
}