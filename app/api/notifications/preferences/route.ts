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

    const preferences = await NotificationService.getPreferences()

    return NextResponse.json(preferences)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const preference = await NotificationService.updatePreference({
      notification_type: body.notification_type,
      in_app: body.in_app,
      email: body.email,
      push: body.push,
    })

    return NextResponse.json(preference)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
