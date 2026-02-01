import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const unreadOnly = searchParams.get('unread') === 'true'

    const notifications = unreadOnly
      ? await NotificationService.getUnread()
      : await NotificationService.getAll(undefined, limit)

    return NextResponse.json(notifications)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const notification = await NotificationService.create({
      user_id: body.user_id,
      type: body.type,
      title: body.title,
      message: body.message,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      action_url: body.action_url,
      action_label: body.action_label,
      priority: body.priority,
      metadata: body.metadata,
      expires_at: body.expires_at,
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
