import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addJobEquipmentSchema, updateJobEquipmentSchema, deleteJobEquipmentSchema } from '@/lib/validations/jobs'

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
