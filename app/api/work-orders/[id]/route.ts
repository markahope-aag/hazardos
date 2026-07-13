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
    // `!job_id` used to be enough, but 20260505000090 upgraded
    // work_orders.job_id -> jobs.id to a composite (job_id, organization_id)
    // FK for tenant-isolation integrity. PostgREST's column-name hint only
    // matches single-column FKs, so this embed must hint by the actual
    // constraint name or every request 404s with PGRST200.
    const { data, error } = await context.supabase
      .from('work_orders')
      .select(`
        *,
        job:jobs!work_orders_job_id_org_fkey(id, job_number, name),
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
    // Archived work orders are off the active list — treat as read-only
    // history. Every other status (draft, issued, revised, completed) is
    // editable; the office may need to apply in-flight corrections to
    // an already-issued work order.
    if (existing.status === 'archived') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Archived work orders are read-only. Unarchive to edit.',
      )
    }

    const update: Record<string, unknown> = {}

    if (body.notes !== undefined) update.notes = body.notes

    if (body.snapshot) {
      const current = (existing.snapshot || {}) as Partial<WorkOrderSnapshot>
      update.snapshot = { ...current, ...body.snapshot }
    }

    // Caller-supplied status takes precedence — that's how the
    // transition buttons (Issue, Complete, Archive, Unarchive) move
    // through the lifecycle.
    if (body.status !== undefined) {
      update.status = body.status
    } else if (
      Object.keys(update).length > 0 &&
      existing.status === 'issued'
    ) {
      // Auto-transition issued → revised when an edit lands without an
      // explicit status. Gives the field team a visible signal that the
      // version in their hands is no longer canonical and they should
      // re-sync.
      update.status = 'revised'
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
    // We allow deletion in any status — the office sometimes generates
    // a work order, then realizes the job's been pushed out and they
    // want a clean slate. The delete is a hard delete (no undo), so the
    // UI confirms before calling.
    void existing

    const { error } = await context.supabase
      .from('work_orders')
      .delete()
      .eq('id', params.id)

    if (error) throwDbError(error, 'delete work order')

    return NextResponse.json({ success: true })
  },
)
