import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

// POST /api/activity/manual - Log a manual activity (note or call)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const { type, entity_type, entity_id, entity_name, content, call_direction, call_duration } = body

    if (!type || !entity_type || !entity_id) {
      throw new SecureError('VALIDATION_ERROR', 'Missing required fields')
    }

    if (type === 'note') {
      if (!content) {
        throw new SecureError('VALIDATION_ERROR', 'Note content is required')
      }
      await Activity.note(entity_type, entity_id, entity_name, content)
    } else if (type === 'call') {
      if (!call_direction) {
        throw new SecureError('VALIDATION_ERROR', 'Call direction is required')
      }
      await Activity.call(entity_type, entity_id, entity_name, {
        direction: call_direction,
        duration: call_duration,
        notes: content,
      })
    } else {
      throw new SecureError('VALIDATION_ERROR', 'Invalid activity type')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
