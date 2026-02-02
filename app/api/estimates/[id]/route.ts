import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateEstimateSchema } from '@/lib/validations/estimates'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/estimates/[id]
 * Get a single estimate with all relations
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, context, params) => {
    const { data: estimate, error } = await context.supabase
      .from('estimates')
      .select(`
        *,
        site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type, status, customer_name),
        customer:customers(id, company_name, first_name, last_name, email, phone),
        created_by_user:profiles!created_by(id, first_name, last_name, email),
        approved_by_user:profiles!approved_by(id, first_name, last_name, email),
        line_items:estimate_line_items(*)
      `)
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new SecureError('NOT_FOUND', 'Estimate not found')
      }
      throw error
    }

    // Transform relations
    const transformedEstimate = {
      ...estimate,
      site_survey: Array.isArray(estimate.site_survey) ? estimate.site_survey[0] : estimate.site_survey,
      customer: Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer,
      created_by_user: Array.isArray(estimate.created_by_user) ? estimate.created_by_user[0] : estimate.created_by_user,
      approved_by_user: Array.isArray(estimate.approved_by_user) ? estimate.approved_by_user[0] : estimate.approved_by_user,
      line_items: estimate.line_items || [],
    }

    // Sort line items by sort_order
    if (transformedEstimate.line_items) {
      transformedEstimate.line_items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    }

    return NextResponse.json({ estimate: transformedEstimate })
  }
)

/**
 * PATCH /api/estimates/[id]
 * Update an estimate
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateEstimateSchema,
  },
  async (_request, context, params, body) => {
    // Check estimate exists and belongs to organization
    const { data: existing, error: existingError } = await context.supabase
      .from('estimates')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (existingError || !existing) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.project_name !== undefined) updateData.project_name = body.project_name
    if (body.scope_of_work !== undefined) updateData.scope_of_work = body.scope_of_work
    if (body.estimated_duration_days !== undefined) updateData.estimated_duration_days = body.estimated_duration_days
    if (body.estimated_start_date !== undefined) updateData.estimated_start_date = body.estimated_start_date
    if (body.estimated_end_date !== undefined) updateData.estimated_end_date = body.estimated_end_date
    if (body.markup_percent !== undefined) updateData.markup_percent = body.markup_percent
    if (body.discount_percent !== undefined) updateData.discount_percent = body.discount_percent
    if (body.tax_percent !== undefined) updateData.tax_percent = body.tax_percent
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.internal_notes !== undefined) updateData.internal_notes = body.internal_notes
    if (body.status !== undefined) updateData.status = body.status

    // Update the estimate
    const { data: estimate, error: updateError } = await context.supabase
      .from('estimates')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ estimate })
  }
)

/**
 * DELETE /api/estimates/[id]
 * Delete an estimate
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'],
  },
  async (_request, context, params) => {
    // Delete the estimate (cascade will delete line items)
    const { error: deleteError } = await context.supabase
      .from('estimates')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  }
)
