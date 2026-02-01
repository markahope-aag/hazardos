/**
 * Next.js Proxy (Edge Middleware)
 *
 * Handles cross-cutting concerns at the edge:
 * - Session management (Supabase)
 * - CORS preflight requests
 * - CORS origin validation
 */

import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { corsMiddleware } from './lib/middleware/cors'

export async function proxy(request: NextRequest) {
  // Handle CORS first (short-circuits for OPTIONS requests)
  const corsResponse = corsMiddleware(request)
  if (corsResponse) {
    return corsResponse
  }

  // Continue with session management
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Match all paths except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}