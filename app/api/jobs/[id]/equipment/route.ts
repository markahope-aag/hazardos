import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import {
  addJobEquipmentSchema,
  updateJobEquipmentSchema,
  deleteJobEquipmentSchema,
} from '@/lib/validations/jobs'

/**
 * POST /api/jobs/[id]/equipment
 * Add equipment to a job
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addJobEquipmentSchema,
  },
  async (_request, _context, params, body) => {
    const equipment = await JobsService.addEquipment(params.id, body)
    return NextResponse.json(equipment, { status: 201 })
  }
)

/**
 * PATCH /api/jobs/[id]/equipment
 * Update equipment status
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateJobEquipmentSchema,
  },
  async (_request, _context, _params, body) => {
    const equipment = await JobsService.updateEquipmentStatus(body.equipment_id, body.status)
    return NextResponse.json(equipment)
  }
)

/**
 * DELETE /api/jobs/[id]/equipment
 * Delete equipment from a job
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: deleteJobEquipmentSchema,
  },
  async (_request, _context, _params, body) => {
    await JobsService.deleteEquipment(body.equipment_id)
    return NextResponse.json({ success: true })
  }
)
