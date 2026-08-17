import { NextResponse } from 'next/server'
import { ROLES } from '@/lib/auth/roles'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import {
  addJobMaterialSchema,
  updateJobMaterialSchema,
  deleteJobMaterialSchema,
} from '@/lib/validations/jobs'

/**
 * POST /api/jobs/[id]/materials
 * Add a material to a job
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addJobMaterialSchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, _context, params, body) => {
    const material = await JobsService.addMaterial(params.id, body)
    return NextResponse.json(material, { status: 201 })
  }
)

/**
 * PATCH /api/jobs/[id]/materials
 * Update material usage
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateJobMaterialSchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, _context, _params, body) => {
    const material = await JobsService.updateMaterialUsage(body.material_id, body.quantity_used)
    return NextResponse.json(material)
  }
)

/**
 * DELETE /api/jobs/[id]/materials
 * Delete a material from a job
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: deleteJobMaterialSchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, _context, _params, body) => {
    await JobsService.deleteMaterial(body.material_id)
    return NextResponse.json({ success: true })
  }
)
