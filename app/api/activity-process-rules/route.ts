import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createRuleSchema } from '@/lib/validations/activity-process-rules'

const RULE_COLUMNS =
  'id, name, event_type, activity_type_id, outcome_id, pipeline_stage_id, job_status, lab_result, message_channel, contact_type, process_id, is_active, sort_order'

/**
 * GET /api/activity-process-rules
 *
 * Embeds the chain name because a rule is unreadable without it: "when a
 * proposal email is completed, run..." needs the other half of the sentence.
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_READ },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('activity_process_rules')
      .select(`${RULE_COLUMNS}, process:activity_processes!process_id(id, name, is_active)`)
      .eq('organization_id', context.profile.organization_id)
      .order('event_type', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throwDbError(error, 'list automation rules')

    const rules = (data ?? []).map((row) => {
      const record = row as Record<string, unknown>
      if (Array.isArray(record.process)) record.process = record.process[0] ?? null
      return record
    })

    return NextResponse.json({ rules })
  }
)

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    // Admin-only, matching the RLS policy. A rule silently changes what
    // happens to every future record, whereas a chain definition only takes
    // effect where a rule points at it.
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: createRuleSchema,
  },
  async (_request, context, body) => {
    // A rule pointing at a chain that is switched off is legitimate (build the
    // rule, then turn the chain on), but pointing at one that does not exist,
    // or belongs to another tenant, is not.
    const { data: process } = await context.supabase
      .from('activity_processes')
      .select('id')
      .eq('id', body.process_id)
      .eq('organization_id', context.profile.organization_id)
      .maybeSingle()

    if (!process) throw new SecureError('NOT_FOUND', 'Automation not found')

    const { data, error } = await context.supabase
      .from('activity_process_rules')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name ?? null,
        event_type: body.event_type,
        activity_type_id: body.activity_type_id ?? null,
        outcome_id: body.outcome_id ?? null,
        pipeline_stage_id: body.pipeline_stage_id ?? null,
        job_status: body.job_status ?? null,
        lab_result: body.lab_result ?? null,
        message_channel: body.message_channel ?? null,
        contact_type: body.contact_type ?? null,
        process_id: body.process_id,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
        created_by: context.user.id,
      })
      .select(RULE_COLUMNS)
      .single()

    if (error) {
      // The unique index exists so two identical rules cannot fire the same
      // chain twice. Say that, rather than surfacing a constraint name.
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'That exact trigger already exists')
      }
      throwDbError(error, 'create automation rule')
    }

    return NextResponse.json({ rule: data }, { status: 201 })
  }
)
