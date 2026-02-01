import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import type {
  ApprovalThreshold,
  ApprovalRequest,
  ApprovalStatus,
  ApprovalEntityType,
  ApprovalDecisionInput,
} from '@/types/sales'

export class ApprovalService {
  // ========== THRESHOLDS ==========

  static async getThresholds(entityType?: ApprovalEntityType): Promise<ApprovalThreshold[]> {
    const supabase = await createClient()

    let query = supabase
      .from('approval_thresholds')
      .select('id, organization_id, entity_type, threshold_amount, approval_level, approver_role, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('threshold_amount')

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as ApprovalThreshold[]
  }

  static async createThreshold(input: {
    entity_type: ApprovalEntityType
    threshold_amount: number
    approval_level: number
    approver_role?: string
  }): Promise<ApprovalThreshold> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    const { data, error } = await supabase
      .from('approval_thresholds')
      .insert({
        organization_id: profile.organization_id,
        entity_type: input.entity_type,
        threshold_amount: input.threshold_amount,
        approval_level: input.approval_level,
        approver_role: input.approver_role || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as ApprovalThreshold
  }

  static async updateThreshold(id: string, updates: Partial<{
    threshold_amount: number
    approval_level: number
    approver_role: string
    is_active: boolean
  }>): Promise<ApprovalThreshold> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('approval_thresholds')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as ApprovalThreshold
  }

  // ========== REQUESTS ==========

  static async getRequests(filters?: {
    entity_type?: ApprovalEntityType
    status?: ApprovalStatus
    requested_by?: string
    pending_only?: boolean
  }): Promise<ApprovalRequest[]> {
    const supabase = await createClient()

    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        requester:profiles!requested_by(full_name),
        level1_approver_user:profiles!level1_approver(full_name),
        level2_approver_user:profiles!level2_approver(full_name)
      `)
      .order('created_at', { ascending: false })

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }
    if (filters?.status) {
      query = query.eq('final_status', filters.status)
    }
    if (filters?.requested_by) {
      query = query.eq('requested_by', filters.requested_by)
    }
    if (filters?.pending_only) {
      query = query.eq('final_status', 'pending')
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(r => ({
      ...r,
      requester: Array.isArray(r.requester) ? r.requester[0] : r.requester,
      level1_approver_user: Array.isArray(r.level1_approver_user) ? r.level1_approver_user[0] : r.level1_approver_user,
      level2_approver_user: Array.isArray(r.level2_approver_user) ? r.level2_approver_user[0] : r.level2_approver_user,
    })) as ApprovalRequest[]
  }

  static async getRequest(id: string): Promise<ApprovalRequest | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        requester:profiles!requested_by(full_name),
        level1_approver_user:profiles!level1_approver(full_name),
        level2_approver_user:profiles!level2_approver(full_name)
      `)
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return {
      ...data,
      requester: Array.isArray(data.requester) ? data.requester[0] : data.requester,
      level1_approver_user: Array.isArray(data.level1_approver_user) ? data.level1_approver_user[0] : data.level1_approver_user,
      level2_approver_user: Array.isArray(data.level2_approver_user) ? data.level2_approver_user[0] : data.level2_approver_user,
    } as ApprovalRequest
  }

  static async createRequest(input: {
    entity_type: ApprovalEntityType
    entity_id: string
    amount?: number
  }): Promise<ApprovalRequest> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    // Check thresholds to determine if level 2 is needed
    const thresholds = await this.getThresholds(input.entity_type)
    const amount = input.amount || 0

    // Find if any threshold requires level 2
    const requiresLevel2 = thresholds.some(
      t => t.approval_level === 2 && amount >= t.threshold_amount
    )

    const { data, error } = await supabase
      .from('approval_requests')
      .insert({
        organization_id: profile.organization_id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        amount: amount,
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        level1_status: 'pending',
        requires_level2: requiresLevel2,
        level2_status: requiresLevel2 ? 'pending' : null,
        final_status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    await Activity.created('approval_request', data.id, `${input.entity_type} approval`)

    return data as ApprovalRequest
  }

  static async decideLevel1(id: string, decision: ApprovalDecisionInput): Promise<ApprovalRequest> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const request = await this.getRequest(id)
    if (!request) throw new Error('Approval request not found')

    const newStatus: ApprovalStatus = decision.approved ? 'approved' : 'rejected'

    // Determine final status
    let finalStatus: ApprovalStatus = newStatus
    if (decision.approved && request.requires_level2) {
      finalStatus = 'pending' // Still need level 2
    }

    const { data, error } = await supabase
      .from('approval_requests')
      .update({
        level1_status: newStatus,
        level1_approver: user.id,
        level1_at: new Date().toISOString(),
        level1_notes: decision.notes || null,
        final_status: finalStatus,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await Activity.statusChanged(
      'approval_request',
      id,
      `${request.entity_type} approval`,
      'pending',
      newStatus
    )

    return data as ApprovalRequest
  }

  static async decideLevel2(id: string, decision: ApprovalDecisionInput): Promise<ApprovalRequest> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const request = await this.getRequest(id)
    if (!request) throw new Error('Approval request not found')
    if (request.level1_status !== 'approved') {
      throw new Error('Level 1 must be approved before level 2')
    }

    const newStatus: ApprovalStatus = decision.approved ? 'approved' : 'rejected'

    const { data, error } = await supabase
      .from('approval_requests')
      .update({
        level2_status: newStatus,
        level2_approver: user.id,
        level2_at: new Date().toISOString(),
        level2_notes: decision.notes || null,
        final_status: newStatus, // Level 2 is final
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await Activity.statusChanged(
      'approval_request',
      id,
      `${request.entity_type} approval`,
      'level1_approved',
      newStatus
    )

    return data as ApprovalRequest
  }

  // ========== QUEUE ==========

  static async getPendingCount(): Promise<number> {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('approval_requests')
      .select('*', { count: 'exact', head: true })
      .eq('final_status', 'pending')

    if (error) throw error
    return count || 0
  }

  static async getMyPendingApprovals(): Promise<ApprovalRequest[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Get user's role to determine what they can approve
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'

    // Get pending requests
    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        requester:profiles!requested_by(full_name)
      `)
      .eq('final_status', 'pending')
      .order('created_at')

    const { data, error } = await query

    if (error) throw error

    // Filter to requests this user can approve
    const requests = (data || []).filter(r => {
      // Admin can approve anything
      if (isAdmin) return true

      // Level 1 pending and not yet approved
      if (r.level1_status === 'pending') return true

      // Level 2 pending and level 1 approved
      if (r.level1_status === 'approved' && r.requires_level2 && r.level2_status === 'pending') {
        return isAdmin // Only admin/owner can do level 2
      }

      return false
    })

    return requests.map(r => ({
      ...r,
      requester: Array.isArray(r.requester) ? r.requester[0] : r.requester,
    })) as ApprovalRequest[]
  }

  // ========== HELPER ==========

  static async checkNeedsApproval(
    entityType: ApprovalEntityType,
    amount: number
  ): Promise<boolean> {
    const thresholds = await this.getThresholds(entityType)
    return thresholds.some(t => amount >= t.threshold_amount)
  }
}
