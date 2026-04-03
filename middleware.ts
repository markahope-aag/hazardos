import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // If hitting signup with an invite token, clear all Supabase auth cookies
  // so the existing user's session doesn't interfere
  if (request.nextUrl.pathname === '/signup' && request.nextUrl.searchParams.has('invite')) {
    const response = NextResponse.next()

    // Delete all Supabase auth cookies
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name)
      }
    }

    return response
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logos/|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
