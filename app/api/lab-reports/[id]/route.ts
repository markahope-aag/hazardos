import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { updateLabReportSchema } from '@/lib/validations/lab-reports'
import { createAdminClient } from '@/lib/supabase/admin'

const SELECT_DETAIL = `
  *,
  lab:labs!lab_id(id, name, contact_name, contact_email, contact_phone),
  estimate:estimates!estimate_id(id, estimate_number, project_name),
  work_order:work_orders!work_order_id(id, work_order_number),
  invoice:invoices!invoice_id(id, invoice_number),
  customer:customers!customer_id(id, name, company_name, email, phone)
`

export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const { data, error } = await context.supabase
      .from('lab_reports')
      .select(SELECT_DETAIL)
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .maybeSingle()

    if (error) throwDbError(error, 'load lab report')
    if (!data) throw new SecureError('NOT_FOUND', 'Lab report not found')
    return NextResponse.json(data)
  },
)

export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateLabReportSchema,
  },
  async (_request, context, params, body) => {
    const orgId = context.profile.organization_id

    const { data: existing, error: existsErr } = await context.supabase
      .from('lab_reports')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (existsErr) throwDbError(existsErr, 'load lab report')
    if (!existing) throw new SecureError('NOT_FOUND', 'Lab report not found')

    const { data, error } = await context.supabase
      .from('lab_reports')
      .update(body)
      .eq('id', params.id)
      .select(SELECT_DETAIL)
      .single()

    if (error) throwDbError(error, 'update lab report')
    return NextResponse.json(data)
  },
)

export const DELETE = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const orgId = context.profile.organization_id

    const { data: existing, error: existsErr } = await context.supabase
      .from('lab_reports')
      .select('id, storage_path')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (existsErr) throwDbError(existsErr, 'load lab report')
    if (!existing) throw new SecureError('NOT_FOUND', 'Lab report not found')

    const { error } = await context.supabase
      .from('lab_reports')
      .delete()
      .eq('id', params.id)
    if (error) throwDbError(error, 'delete lab report')

    // Best-effort cleanup of any uploaded file. Use the admin client so
    // RLS storage-side doesn't block the cleanup just because the row
    // is already gone.
    if (existing.storage_path) {
      const admin = createAdminClient()
      await admin.storage.from('lab-reports').remove([existing.storage_path])
    }

    return NextResponse.json({ success: true })
  },
)
