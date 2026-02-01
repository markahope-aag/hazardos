import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'
import type { JobNoteType } from '@/types/jobs'

const validNoteTypes: JobNoteType[] = [
  'general',
  'issue',
  'customer_communication',
  'inspection',
  'safety',
  'photo',
]

export async function POST(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { id } = await _params
    const body = await request.json()

    validateRequired(body.content, 'content')

    if (body.note_type && !validNoteTypes.includes(body.note_type)) {
      throw new SecureError('VALIDATION_ERROR', `Invalid note_type. Must be one of: ${validNoteTypes.join(', ')}`)
    }

    const note = await JobsService.addNote(id, {
      note_type: body.note_type || 'general',
      content: body.content,
      attachments: body.attachments,
      is_internal: body.is_internal,
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { note_id } = await request.json()

    validateRequired(note_id, 'note_id')

    await JobsService.deleteNote(note_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
