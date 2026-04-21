import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateManifestSchema } from '@/lib/validations/manifests'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import type { ManifestSnapshot } from '@/types/manifests'

/**
 * GET /api/manifests/[id]
 * Detail view + associated vehicles.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const { data, error } = await context.supabase
      .from('manifests')
      .select(`
        *,
        job:jobs!job_id(id, job_number, name),
        vehicles:manifest_vehicles(*)
      `)
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (error || !data) {
      throw new SecureError('NOT_FOUND', 'Manifest not found')
    }

    return NextResponse.json({ manifest: data })
  },
)

/**
 * PATCH /api/manifests/[id]
 * Edit notes and/or snapshot sections while the manifest is in draft.
 * Merges the incoming snapshot subtree into the stored snapshot so the
 * caller can update one section at a time without reposting everything.
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_MANAGE,
    bodySchema: updateManifestSchema,
  },
  async (_request, context, params, body) => {
    const { data: existing } = await context.supabase
      .from('manifests')
      .select('id, status, snapshot')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!existing) throw new SecureError('NOT_FOUND', 'Manifest not found')
    if (existing.status === 'issued') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Issued manifests are locked. Unissue to edit, or create a new one.',
      )
    }

    const update: Record<string, unknown> = {}

    if (body.notes !== undefined) update.notes = body.notes

    if (body.snapshot) {
      const current = (existing.snapshot || {}) as Partial<ManifestSnapshot>
      update.snapshot = { ...current, ...body.snapshot }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ manifest: existing })
    }

    const { data, error } = await context.supabase
      .from('manifests')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throwDbError(error, 'update manifest')

    return NextResponse.json({ manifest: data })
  },
)

/**
 * DELETE /api/manifests/[id]
 * Hard-delete. Only allowed while the manifest is draft — once issued
 * we keep the audit record.
 */
export const DELETE = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_MANAGE,
  },
  async (_request, context, params) => {
    const { data: existing } = await context.supabase
      .from('manifests')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!existing) throw new SecureError('NOT_FOUND', 'Manifest not found')
    if (existing.status === 'issued') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Cannot delete an issued manifest.',
      )
    }

    const { error } = await context.supabase
      .from('manifests')
      .delete()
      .eq('id', params.id)

    if (error) throwDbError(error, 'delete manifest')

    return NextResponse.json({ success: true })
  },
)
