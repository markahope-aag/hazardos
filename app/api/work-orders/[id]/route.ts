import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateWorkOrderSchema } from '@/lib/validations/work-orders'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import type { WorkOrderSnapshot } from '@/types/work-orders'
import type { SurveyPhotoMetadata } from '@/types/database'

/**
 * GET /api/work-orders/[id]
 * Detail view + associated vehicles + the linked survey's media so the
 * crew has site context on the way to the job. Media is loaded live
 * (not snapshotted) so any photos the office adds after issuance still
 * show up for the field team.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const { data, error } = await context.supabase
      .from('work_orders')
      .select(`
        *,
        job:jobs!job_id(id, job_number, name),
        vehicles:work_order_vehicles(*)
      `)
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (error || !data) {
      throw new SecureError('NOT_FOUND', 'Work order not found')
    }

    let surveyMedia: SurveyPhotoMetadata[] | null = null
    const surveyId = (data.snapshot as WorkOrderSnapshot | null)?.job?.site_survey_id
    if (surveyId) {
      const { data: survey } = await context.supabase
        .from('site_surveys')
        .select('photo_metadata')
        .eq('id', surveyId)
        .eq('organization_id', context.profile.organization_id)
        .single()
      surveyMedia = (survey?.photo_metadata as SurveyPhotoMetadata[] | null) ?? null
    }

    return NextResponse.json({ work_order: data, surveyMedia })
  },
)

/**
 * PATCH /api/work-orders/[id]
 * Edit notes and/or snapshot sections while the work order is in draft.
 * Merges the incoming snapshot subtree into the stored snapshot so the
 * caller can update one section at a time without reposting everything.
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_MANAGE,
    bodySchema: updateWorkOrderSchema,
  },
  async (_request, context, params, body) => {
    const { data: existing } = await context.supabase
      .from('work_orders')
      .select('id, status, snapshot')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!existing) throw new SecureError('NOT_FOUND', 'Work order not found')
    if (existing.status === 'issued') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Issued work orders are locked. Unissue to edit, or create a new one.',
      )
    }

    const update: Record<string, unknown> = {}

    if (body.notes !== undefined) update.notes = body.notes

    if (body.snapshot) {
      const current = (existing.snapshot || {}) as Partial<WorkOrderSnapshot>
      update.snapshot = { ...current, ...body.snapshot }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ work_order: existing })
    }

    const { data, error } = await context.supabase
      .from('work_orders')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throwDbError(error, 'update work order')

    return NextResponse.json({ work_order: data })
  },
)

/**
 * DELETE /api/work-orders/[id]
 * Hard-delete. Only allowed while the work order is draft — once issued
 * we keep the audit record.
 */
export const DELETE = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_MANAGE,
  },
  async (_request, context, params) => {
    const { data: existing } = await context.supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!existing) throw new SecureError('NOT_FOUND', 'Work order not found')
    if (existing.status === 'issued') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Cannot delete an issued work order.',
      )
    }

    const { error } = await context.supabase
      .from('work_orders')
      .delete()
      .eq('id', params.id)

    if (error) throwDbError(error, 'delete work order')

    return NextResponse.json({ success: true })
  },
)
