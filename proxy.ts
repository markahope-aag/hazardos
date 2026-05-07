/**
 * Next.js Proxy (Edge Middleware)
 *
 * Handles cross-cutting concerns at the edge:
 * - Session management (Supabase)
 * - CORS preflight requests
 * - CORS origin validation
 */

import '@/lib/env'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { corsMiddleware } from './lib/middleware/cors'

// AUTH_ROUTES bounce authenticated users away (so logged-in users don't see
// login/signup again). /reset-password is intentionally NOT in this list:
// the recovery flow logs the user in via verifyOtp before landing them on
// /reset-password to pick a new password — they need to access it while
// authenticated.
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password']
// /api/webhooks/* is provider-to-server (Resend, Stripe, etc.) — no
// session cookies present, so the dashboard redirect must not fire.
// Webhook handlers authenticate the call internally via signature check.
// /api/auth/* is called from unauthenticated auth pages (e.g. forgot-password
// posts here) — redirecting to /login would 405 the POST and break the flow.
// /auth/* covers /auth/callback (OAuth) and /auth/confirm (recovery/magic-link
// verification). Recovery links land on /auth/confirm before any session
// exists, so it must not require auth.
const PUBLIC_ROUTES = [
  ...AUTH_ROUTES,
  '/reset-password',
  '/auth/',
  '/onboard',
  '/api/webhooks',
  '/api/auth',
]

export async function proxy(request: NextRequest) {
  // Handle CORS first (short-circuits for OPTIONS requests)
  const corsResponse = corsMiddleware(request)
  if (corsResponse) {
    return corsResponse
  }

  // Continue with session management
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Skip auth redirects if Supabase isn't configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  // Check for Supabase auth cookie to determine if user is authenticated
  const hasAuthCookie = request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
  )

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isDashboardRoute = !isPublicRoute && pathname !== '/'

  // Redirect authenticated users away from auth pages
  // Exception: signup with invite token — clear session so invitee can register
  if (hasAuthCookie && isAuthRoute) {
    if (pathname === '/signup' && request.nextUrl.searchParams.has('invite')) {
      // Strip auth cookies so the signup page renders clean
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.delete(cookie.name)
        }
      }
      return response
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect unauthenticated users away from dashboard routes
  if (!hasAuthCookie && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}