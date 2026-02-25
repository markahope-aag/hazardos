/**
 * Next.js Proxy (Edge Middleware)
 *
 * Handles cross-cutting concerns at the edge:
 * - Session management (Supabase)
 * - CORS preflight requests
 * - CORS origin validation
 */

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { corsMiddleware } from './lib/middleware/cors'

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']
const PUBLIC_ROUTES = [...AUTH_ROUTES, '/auth/callback', '/onboard']

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
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  )

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isDashboardRoute = !isPublicRoute && pathname !== '/'

  // Redirect authenticated users away from auth pages
  if (hasAuthCookie && isAuthRoute) {
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