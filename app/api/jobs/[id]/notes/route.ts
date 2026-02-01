import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addJobNoteSchema, deleteJobNoteSchema } from '@/lib/validations/jobs'

/**
 * POST /api/jobs/[id]/notes
 * Add a note to a job
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addJobNoteSchema,
  },
  async (_request, _context, params, body) => {
    const note = await JobsService.addNote(params.id, body)
    return NextResponse.json(note, { status: 201 })
  }
)

/**
 * DELETE /api/jobs/[id]/notes
 * Delete a note from a job
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: deleteJobNoteSchema,
  },
  async (_request, _context, _params, body) => {
    await JobsService.deleteNote(body.note_id)
    return NextResponse.json({ success: true })
  }
)
