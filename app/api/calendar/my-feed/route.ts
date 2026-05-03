import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/calendar/my-feed
 *
 * Returns the current user's iCal subscribe URL. The token is stored
 * on profiles.calendar_feed_token and is treated like a password —
 * possession of the URL grants read access to the user's schedule.
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (request, context) => {
    const { data, error } = await context.supabase
      .from('profiles')
      .select('calendar_feed_token')
      .eq('id', context.user.id)
      .single()

    if (error || !data?.calendar_feed_token) {
      throw error || new Error('Calendar feed token missing')
    }

    const origin = request.nextUrl.origin
    const url = `${origin}/api/calendar/feed/${data.calendar_feed_token}`

    return NextResponse.json({ url, token: data.calendar_feed_token })
  }
)

/**
 * POST /api/calendar/my-feed/rotate
 *
 * Rotates the token, invalidating the old subscribe URL — used when
 * the user thinks the old URL leaked (lost device, ex-employee, etc).
 */
export const POST = createApiHandler(
  { rateLimit: 'general' },
  async (request, context) => {
    // Use Postgres' gen_random_uuid() via .update() with sql expression
    // requires raw SQL — easier to generate client-side and store.
    const newToken = crypto.randomUUID()

    const { error } = await context.supabase
      .from('profiles')
      .update({ calendar_feed_token: newToken })
      .eq('id', context.user.id)

    if (error) throw error

    const origin = request.nextUrl.origin
    const url = `${origin}/api/calendar/feed/${newToken}`
    return NextResponse.json({ url, token: newToken })
  }
)
