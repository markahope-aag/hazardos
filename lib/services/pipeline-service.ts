import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import type {
  PipelineStage,
  Opportunity,
  OpportunityHistory,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  PipelineMetrics,
} from '@/types/sales'

export class PipelineService {
  // ========== STAGES ==========

  static async getStages(): Promise<PipelineStage[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('id, organization_id, name, color, stage_type, probability, sort_order, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return (data || []) as PipelineStage[]
  }

  static async createStage(input: {
    name: string
    color?: string
    stage_type: string
    probability?: number
  }): Promise<PipelineStage> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    // Get max sort order
    const { data: maxOrder } = await supabase
      .from('pipeline_stages')
      .select('sort_order')
      .eq('organization_id', profile.organization_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({
        organization_id: profile.organization_id,
        name: input.name,
        color: input.color || '#6366f1',
        stage_type: input.stage_type,
        probability: input.probability || 0,
        sort_order: (maxOrder?.sort_order || 0) + 1,
      })
      .select()
      .single()

    if (error) throw error
    return data as PipelineStage
  }

  // ========== OPPORTUNITIES ==========

  static async getOpportunities(options?: {
    stageId?: string
    limit?: number
    offset?: number
  }): Promise<{ opportunities: Opportunity[]; total: number; limit: number; offset: number }> {
    const supabase = await createClient()

    const limit = options?.limit || 100
    const offset = options?.offset || 0

    let query = supabase
      .from('opportunities')
      .select(`
        *,
        stage:pipeline_stages(*),
        customer:customers(id, company_name, first_name, last_name),
        owner:profiles(id, full_name)
      `, { count: 'exact' })
      .is('outcome', null)
      .order('updated_at', { ascending: false })

    if (options?.stageId) {
      query = query.eq('stage_id', options.stageId)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const opportunities = (data || []).map(opp => ({
      ...opp,
      stage: Array.isArray(opp.stage) ? opp.stage[0] : opp.stage,
      customer: Array.isArray(opp.customer) ? opp.customer[0] : opp.customer,
      owner: Array.isArray(opp.owner) ? opp.owner[0] : opp.owner,
    })) as Opportunity[]

    return { opportunities, total: count || 0, limit, offset }
  }

  static async getOpportunity(id: string): Promise<Opportunity | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        stage:pipeline_stages(*),
        customer:customers(id, company_name, first_name, last_name),
        owner:profiles(id, full_name)
      `)
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return {
      ...data,
      stage: Array.isArray(data.stage) ? data.stage[0] : data.stage,
      customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
      owner: Array.isArray(data.owner) ? data.owner[0] : data.owner,
    } as Opportunity
  }

  static async createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    // Get stage probability
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('probability')
      .eq('id', input.stage_id)
      .single()

    const weighted = input.estimated_value && stage
      ? input.estimated_value * (stage.probability / 100)
      : null

    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        organization_id: profile.organization_id,
        customer_id: input.customer_id,
        name: input.name,
        description: input.description || null,
        stage_id: input.stage_id,
        estimated_value: input.estimated_value || null,
        weighted_value: weighted,
        expected_close_date: input.expected_close_date || null,
        owner_id: input.owner_id || user.id,
      })
      .select()
      .single()

    if (error) throw error

    await Activity.created('opportunity', data.id, input.name)

    return data as Opportunity
  }

  static async updateOpportunity(id: string, input: UpdateOpportunityInput): Promise<Opportunity> {
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.estimated_value !== undefined) updateData.estimated_value = input.estimated_value
    if (input.expected_close_date !== undefined) updateData.expected_close_date = input.expected_close_date
    if (input.owner_id !== undefined) updateData.owner_id = input.owner_id
    if (input.loss_reason !== undefined) updateData.loss_reason = input.loss_reason
    if (input.loss_notes !== undefined) updateData.loss_notes = input.loss_notes
    if (input.competitor !== undefined) updateData.competitor = input.competitor

    // Handle stage change separately
    if (input.stage_id !== undefined) {
      return this.moveOpportunity(id, input.stage_id)
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await Activity.updated('opportunity', id, data.name)

    return data as Opportunity
  }

  static async moveOpportunity(id: string, stageId: string, notes?: string): Promise<Opportunity> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const current = await this.getOpportunity(id)
    if (!current) throw new Error('Opportunity not found')

    // Get new stage details
    const { data: newStage } = await supabase
      .from('pipeline_stages')
      .select('id, name, stage_type, probability')
      .eq('id', stageId)
      .single()

    if (!newStage) throw new Error('Stage not found')

    // Calculate weighted value
    const weighted = current.estimated_value
      ? current.estimated_value * (newStage.probability / 100)
      : null

    // Determine outcome based on stage type
    const outcome = newStage.stage_type === 'won' ? 'won' :
                    newStage.stage_type === 'lost' ? 'lost' : null

    const { data, error } = await supabase
      .from('opportunities')
      .update({
        stage_id: stageId,
        weighted_value: weighted,
        outcome,
        actual_close_date: outcome ? new Date().toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Record history
    await supabase.from('opportunity_history').insert({
      opportunity_id: id,
      from_stage_id: current.stage_id,
      to_stage_id: stageId,
      changed_by: user.id,
      notes: notes || null,
    })

    await Activity.statusChanged(
      'opportunity',
      id,
      current.name,
      current.stage?.name || 'Unknown',
      newStage.name
    )

    return data as Opportunity
  }

  static async deleteOpportunity(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== HISTORY ==========

  static async getOpportunityHistory(opportunityId: string): Promise<OpportunityHistory[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('opportunity_history')
      .select(`
        *,
        from_stage:pipeline_stages!from_stage_id(*),
        to_stage:pipeline_stages!to_stage_id(*),
        changed_by_user:profiles!changed_by(full_name)
      `)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(h => ({
      ...h,
      from_stage: Array.isArray(h.from_stage) ? h.from_stage[0] : h.from_stage,
      to_stage: Array.isArray(h.to_stage) ? h.to_stage[0] : h.to_stage,
      changed_by_user: Array.isArray(h.changed_by_user) ? h.changed_by_user[0] : h.changed_by_user,
    })) as OpportunityHistory[]
  }

  // ========== METRICS ==========

  static async getPipelineMetrics(): Promise<PipelineMetrics> {
    const supabase = await createClient()

    // For metrics, get all opportunities (use high limit)
    const { opportunities } = await this.getOpportunities({ limit: 10000 })
    const stages = await this.getStages()

    const total_value = opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0)
    const weighted_value = opportunities.reduce((sum, o) => sum + (o.weighted_value || 0), 0)

    const by_stage = stages.map(stage => {
      const stageOpps = opportunities.filter(o => o.stage_id === stage.id)
      return {
        stage_id: stage.id,
        stage_name: stage.name,
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
      }
    })

    return {
      total_value,
      weighted_value,
      count: opportunities.length,
      by_stage,
    }
  }

  // ========== WIN/LOSS TRACKING ==========

  static async getWonOpportunities(dateRange?: { start: string; end: string }): Promise<Opportunity[]> {
    const supabase = await createClient()

    let query = supabase
      .from('opportunities')
      .select(`
        *,
        stage:pipeline_stages(*),
        customer:customers(id, company_name, first_name, last_name),
        owner:profiles(id, full_name)
      `)
      .eq('outcome', 'won')
      .order('actual_close_date', { ascending: false })

    if (dateRange) {
      query = query
        .gte('actual_close_date', dateRange.start)
        .lte('actual_close_date', dateRange.end)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(opp => ({
      ...opp,
      stage: Array.isArray(opp.stage) ? opp.stage[0] : opp.stage,
      customer: Array.isArray(opp.customer) ? opp.customer[0] : opp.customer,
      owner: Array.isArray(opp.owner) ? opp.owner[0] : opp.owner,
    })) as Opportunity[]
  }

  static async getLostOpportunities(dateRange?: { start: string; end: string }): Promise<Opportunity[]> {
    const supabase = await createClient()

    let query = supabase
      .from('opportunities')
      .select(`
        *,
        stage:pipeline_stages(*),
        customer:customers(id, company_name, first_name, last_name),
        owner:profiles(id, full_name)
      `)
      .eq('outcome', 'lost')
      .order('actual_close_date', { ascending: false })

    if (dateRange) {
      query = query
        .gte('actual_close_date', dateRange.start)
        .lte('actual_close_date', dateRange.end)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(opp => ({
      ...opp,
      stage: Array.isArray(opp.stage) ? opp.stage[0] : opp.stage,
      customer: Array.isArray(opp.customer) ? opp.customer[0] : opp.customer,
      owner: Array.isArray(opp.owner) ? opp.owner[0] : opp.owner,
    })) as Opportunity[]
  }

  static async getLossReasonStats(): Promise<{ reason: string; count: number }[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('opportunities')
      .select('loss_reason')
      .eq('outcome', 'lost')
      .not('loss_reason', 'is', null)

    if (error) throw error

    // Group by loss reason
    const counts: Record<string, number> = {}
    data?.forEach(o => {
      const reason = o.loss_reason || 'Unknown'
      counts[reason] = (counts[reason] || 0) + 1
    })

    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
  }
}
