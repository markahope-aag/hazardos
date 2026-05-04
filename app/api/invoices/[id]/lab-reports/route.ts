import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'

const putSchema = z.object({
  lab_report_ids: z.array(z.string().uuid()),
})

/**
 * PUT /api/invoices/[id]/lab-reports
 * Replace the set of lab reports attached to this invoice. Lab reports
 * carry their own invoice_id pointer (rather than going through a join
 * table), so this endpoint diffs the current vs. desired set and patches
 * each side accordingly:
 *
 *   - Reports newly added → invoice_id = this invoice
 *   - Reports removed     → invoice_id = NULL
 *
 * Reports already pointing at this invoice and still selected are left
 * alone. RLS scopes everything to the caller's org.
 */
export const PUT = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: putSchema,
  },
  async (_request, context, params, body) => {
    const orgId = context.profile.organization_id

    const { data: invoice, error: invErr } = await context.supabase
      .from('invoices')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (invErr) throwDbError(invErr, 'load invoice')
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

    if (body.lab_report_ids.length > 0) {
      const { data: rows, error: vErr } = await context.supabase
        .from('lab_reports')
        .select('id')
        .eq('organization_id', orgId)
        .in('id', body.lab_report_ids)
      if (vErr) throwDbError(vErr, 'verify lab reports')
      if (!rows || rows.length !== body.lab_report_ids.length) {
        throw new SecureError('NOT_FOUND', 'One or more lab reports not found')
      }
    }

    const desired = new Set(body.lab_report_ids)

    const { data: current, error: curErr } = await context.supabase
      .from('lab_reports')
      .select('id')
      .eq('invoice_id', params.id)
      .eq('organization_id', orgId)
    if (curErr) throwDbError(curErr, 'load current lab reports')

    const currentIds = new Set((current || []).map((r) => r.id))
    const toClear = [...currentIds].filter((id) => !desired.has(id))
    const toSet = [...desired].filter((id) => !currentIds.has(id))

    if (toClear.length > 0) {
      const { error } = await context.supabase
        .from('lab_reports')
        .update({ invoice_id: null })
        .in('id', toClear)
        .eq('organization_id', orgId)
      if (error) throwDbError(error, 'detach lab reports')
    }

    if (toSet.length > 0) {
      const { error } = await context.supabase
        .from('lab_reports')
        .update({ invoice_id: params.id })
        .in('id', toSet)
        .eq('organization_id', orgId)
      if (error) throwDbError(error, 'attach lab reports')
    }

    return NextResponse.json({ success: true, count: desired.size })
  },
)
