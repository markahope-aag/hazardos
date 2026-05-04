import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import {
  createLabReportSchema,
  listLabReportsQuerySchema,
} from '@/lib/validations/lab-reports'

const SELECT_LIST = `
  *,
  lab:labs!lab_id(id, name),
  estimate:estimates!estimate_id(id, estimate_number, project_name),
  work_order:work_orders!work_order_id(id, work_order_number),
  invoice:invoices!invoice_id(id, invoice_number),
  customer:customers!customer_id(id, name, company_name)
`

/**
 * GET /api/lab-reports
 * List lab reports with optional filtering. Search (`q`) covers report
 * number, sample description, and the site address — the columns the
 * user is most likely to recognise when scanning.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: listLabReportsQuerySchema,
  },
  async (_request, context, _body, query) => {
    const orgId = context.profile.organization_id

    let supaQuery = context.supabase
      .from('lab_reports')
      .select(SELECT_LIST)
      .eq('organization_id', orgId)
      .order('ordered_date', { ascending: false })

    if (query.status) supaQuery = supaQuery.eq('status', query.status)
    if (query.sample_type) supaQuery = supaQuery.eq('sample_type', query.sample_type)
    if (query.estimate_id) supaQuery = supaQuery.eq('estimate_id', query.estimate_id)
    if (query.work_order_id) supaQuery = supaQuery.eq('work_order_id', query.work_order_id)
    if (query.invoice_id) supaQuery = supaQuery.eq('invoice_id', query.invoice_id)
    if (query.customer_id) supaQuery = supaQuery.eq('customer_id', query.customer_id)
    if (query.from_date) supaQuery = supaQuery.gte('ordered_date', query.from_date)
    if (query.to_date) supaQuery = supaQuery.lte('ordered_date', query.to_date)

    if (query.q) {
      // Quote-escape user input for the OR expression — Supabase's
      // .or() takes a comma-separated filter string, so a literal
      // comma in the search would otherwise split the clause.
      const safe = query.q.replace(/[%,()]/g, ' ').trim()
      if (safe.length > 0) {
        const pattern = `%${safe}%`
        supaQuery = supaQuery.or(
          `report_number.ilike.${pattern},sample_description.ilike.${pattern},site_address.ilike.${pattern},site_city.ilike.${pattern}`,
        )
      }
    }

    const { data, error } = await supaQuery
    if (error) throwDbError(error, 'list lab reports')
    return NextResponse.json({ lab_reports: data || [] })
  },
)

/**
 * POST /api/lab-reports
 * Create a new lab report (status starts as 'ordered'). The actual
 * lab-result file is uploaded separately to /[id]/upload once the lab
 * sends it back.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createLabReportSchema,
  },
  async (_request, context, body) => {
    const orgId = context.profile.organization_id

    const { data: reportNumber, error: numErr } = await context.supabase
      .rpc('generate_lab_report_number', { org_id: orgId })
    if (numErr) throwDbError(numErr, 'generate lab report number')

    const { data, error } = await context.supabase
      .from('lab_reports')
      .insert({
        organization_id: orgId,
        report_number: reportNumber,
        ordered_date: body.ordered_date,
        lab_id: body.lab_id ?? null,
        sample_type: body.sample_type,
        sample_description: body.sample_description ?? null,
        site_address: body.site_address ?? null,
        site_city: body.site_city ?? null,
        site_state: body.site_state ?? null,
        site_zip: body.site_zip ?? null,
        estimate_id: body.estimate_id ?? null,
        work_order_id: body.work_order_id ?? null,
        invoice_id: body.invoice_id ?? null,
        customer_id: body.customer_id ?? null,
        notes: body.notes ?? null,
        created_by: context.user.id,
      })
      .select(SELECT_LIST)
      .single()

    if (error) throwDbError(error, 'create lab report')
    return NextResponse.json(data, { status: 201 })
  },
)
