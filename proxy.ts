import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Update Supabase session (handles cookie refresh with secure settings)
  const response = await updateSession(request)

  // Add security headers to response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}