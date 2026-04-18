import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { NotificationService } from '@/lib/services/notification-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import type {
  ApprovalThreshold,
  ApprovalRequest,
  ApprovalStatus,
  ApprovalEntityType,
  ApprovalDecisionInput,
} from '@/types/sales'

const log = createServiceLogger('ApprovalService')

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

    if (error) throwDbError(error, 'fetch approval thresholds')
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
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'create approval threshold')
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

    if (error) throwDbError(error, 'update approval threshold')
    return data as ApprovalThreshold
  }

  // ========== REQUESTS ==========

  static async getRequests(filters?: {
    entity_type?: ApprovalEntityType
    status?: ApprovalStatus
    requested_by?: string
    pending_only?: boolean
    limit?: number
    offset?: number
  }): Promise<{ requests: ApprovalRequest[]; total: number; limit: number; offset: number }> {
    const supabase = await createClient()

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        requester:profiles!requested_by(full_name),
        level1_approver_user:profiles!level1_approver(full_name),
        level2_approver_user:profiles!level2_approver(full_name)
      `, { count: 'exact' })
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

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throwDbError(error, 'fetch approval requests')

    const requests = (data || []).map(r => ({
      ...r,
      requester: Array.isArray(r.requester) ? r.requester[0] : r.requester,
      level1_approver_user: Array.isArray(r.level1_approver_user) ? r.level1_approver_user[0] : r.level1_approver_user,
      level2_approver_user: Array.isArray(r.level2_approver_user) ? r.level2_approver_user[0] : r.level2_approver_user,
    })) as ApprovalRequest[]

    return { requests, total: count || 0, limit, offset }
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

    if (error && error.code !== 'PGRST116') throwDbError(error, 'fetch approval request')
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
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'create approval request')

    await Activity.created('approval_request', data.id, `${input.entity_type} approval`)

    return data as ApprovalRequest
  }

  static async decideLevel1(id: string, decision: ApprovalDecisionInput): Promise<ApprovalRequest> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const request = await this.getRequest(id)
    if (!request) throw new SecureError('NOT_FOUND', 'Approval request not found')

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

    if (error) throwDbError(error, 'update approval request')

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
    if (!user) throw new SecureError('UNAUTHORIZED')

    const request = await this.getRequest(id)
    if (!request) throw new SecureError('NOT_FOUND', 'Approval request not found')
    if (request.level1_status !== 'approved') {
      throw new SecureError('BAD_REQUEST', 'Level 1 must be approved before level 2')
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

    if (error) throwDbError(error, 'update approval request')

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

    if (error) throwDbError(error, 'count approval requests')
    return count || 0
  }

  static async getMyPendingApprovals(): Promise<ApprovalRequest[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    // Get user's role to determine what they can approve
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'

    // Get pending requests
    const query = supabase
      .from('approval_requests')
      .select(`
        *,
        requester:profiles!requested_by(full_name)
      `)
      .eq('final_status', 'pending')
      .order('created_at')

    const { data, error } = await query

    if (error) throwDbError(error, 'fetch approval requests')

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

  // ========== ESTIMATE WORKFLOW ==========
  //
  // The real-world flow: surveyor drafts → office manager (L1/admin) reviews
  // → company owner (L2/tenant_owner) approves → estimate is sent to customer.
  // Two-level approval is always required for estimates, regardless of amount.

  static async submitEstimateForApproval(estimateId: string): Promise<ApprovalRequest> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    const { data: estimate } = await supabase
      .from('estimates')
      .select('id, status, total, organization_id')
      .eq('id', estimateId)
      .eq('organization_id', profile.organization_id)
      .single()
    if (!estimate) throw new SecureError('NOT_FOUND', 'Estimate not found')
    if (estimate.status !== 'draft') {
      throw new SecureError('VALIDATION_ERROR', 'Only draft estimates can be submitted for approval')
    }

    const { data: approvalRequest, error } = await supabase
      .from('approval_requests')
      .insert({
        organization_id: profile.organization_id,
        entity_type: 'estimate',
        entity_id: estimateId,
        amount: estimate.total || 0,
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        level1_status: 'pending',
        requires_level2: true,
        level2_status: 'pending',
        final_status: 'pending',
      })
      .select()
      .single()
    if (error) throwDbError(error, 'create estimate approval request')

    await supabase
      .from('estimates')
      .update({ status: 'pending_approval' })
      .eq('id', estimateId)

    try {
      await NotificationService.createForRole({
        role: 'admin',
        type: 'reminder',
        title: 'Estimate awaiting your review',
        message: 'A surveyor has submitted an estimate that needs your review before it goes to the owner.',
        entity_type: 'estimate',
        entity_id: estimateId,
        action_url: `/estimates/${estimateId}`,
        priority: 'normal',
      })
    } catch (e) {
      log.warn({ estimateId, err: formatError(e) }, 'failed to notify admins of estimate submission')
    }

    await Activity.created('approval_request', approvalRequest.id, 'estimate approval')
    return approvalRequest as ApprovalRequest
  }

  static async reviewEstimate(
    estimateId: string,
    decision: ApprovalDecisionInput,
  ): Promise<{ request: ApprovalRequest; level: 1 | 2; finalized: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    const { data: request } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('entity_type', 'estimate')
      .eq('entity_id', estimateId)
      .eq('final_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!request) throw new SecureError('NOT_FOUND', 'No pending approval request for this estimate')

    let level: 1 | 2
    if (request.level1_status === 'pending') {
      level = 1
    } else if (request.level1_status === 'approved' && request.requires_level2 && request.level2_status === 'pending') {
      level = 2
    } else {
      throw new SecureError('VALIDATION_ERROR', 'Approval request is not currently reviewable')
    }

    // Role gate: admins + tenant_owner can do L1; only tenant_owner (or platform
    // roles) can do L2. This mirrors the real-world "office manager reviews,
    // owner has final say" rule.
    const role = profile.role
    const isOwnerLike = role === 'tenant_owner' || role === 'platform_owner' || role === 'platform_admin'
    const isAdminLike = isOwnerLike || role === 'admin'
    if (level === 1 && !isAdminLike) {
      throw new SecureError('FORBIDDEN', 'Only admins can perform the first review')
    }
    if (level === 2 && !isOwnerLike) {
      throw new SecureError('FORBIDDEN', 'Only the company owner can give final approval')
    }

    const now = new Date().toISOString()
    const newLevelStatus: ApprovalStatus = decision.approved ? 'approved' : 'rejected'
    let finalStatus: ApprovalStatus = 'pending'

    const updates: Record<string, unknown> = {}
    if (level === 1) {
      updates.level1_status = newLevelStatus
      updates.level1_approver = user.id
      updates.level1_at = now
      updates.level1_notes = decision.notes || null
      if (!decision.approved) finalStatus = 'rejected'
      else if (!request.requires_level2) finalStatus = 'approved'
    } else {
      updates.level2_status = newLevelStatus
      updates.level2_approver = user.id
      updates.level2_at = now
      updates.level2_notes = decision.notes || null
      finalStatus = newLevelStatus
    }
    updates.final_status = finalStatus

    const { data: updated, error } = await supabase
      .from('approval_requests')
      .update(updates)
      .eq('id', request.id)
      .select()
      .single()
    if (error) throwDbError(error, 'record approval decision')

    const finalized = finalStatus !== 'pending'

    if (!decision.approved) {
      // Send back to draft and notify the originator.
      await supabase
        .from('estimates')
        .update({ status: 'draft', approval_notes: decision.notes || null })
        .eq('id', estimateId)

      try {
        await NotificationService.create({
          user_id: request.requested_by,
          type: 'reminder',
          title: 'Estimate sent back for changes',
          message: decision.notes
            ? `Reviewer notes: ${decision.notes}`
            : 'Your estimate needs revisions before it can move forward.',
          entity_type: 'estimate',
          entity_id: estimateId,
          action_url: `/estimates/${estimateId}`,
          priority: 'high',
        })
      } catch (e) {
        log.warn({ estimateId, err: formatError(e) }, 'failed to notify originator of rejection')
      }
    } else if (level === 1) {
      // Forwarded to the owner for final approval.
      try {
        await NotificationService.createForRole({
          role: 'tenant_owner',
          type: 'reminder',
          title: 'Estimate ready for your final approval',
          message: 'The office manager has reviewed an estimate and forwarded it to you.',
          entity_type: 'estimate',
          entity_id: estimateId,
          action_url: `/estimates/${estimateId}`,
          priority: 'normal',
        })
      } catch (e) {
        log.warn({ estimateId, err: formatError(e) }, 'failed to notify owner of forwarded estimate')
      }
    } else {
      // Final approval: mark estimate approved and auto-deliver to the customer.
      await supabase
        .from('estimates')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: now,
          approval_notes: decision.notes || null,
        })
        .eq('id', estimateId)

      try {
        await this.createAndSendProposalFromEstimate(estimateId)
      } catch (e) {
        log.error({ estimateId, err: formatError(e) }, 'failed to auto-convert approved estimate to proposal')
      }
    }

    await Activity.statusChanged(
      'approval_request',
      request.id,
      'estimate approval',
      level === 1 ? 'pending' : 'level1_approved',
      newLevelStatus,
    )

    return { request: updated as ApprovalRequest, level, finalized }
  }

  // Converts an approved estimate into a proposal and, if email is configured,
  // emails the customer with a portal link. Silent on failure — the owner
  // already approved; we don't want a flaky email vendor to leave the system
  // in a half-approved state. Errors are logged for follow-up.
  static async createAndSendProposalFromEstimate(estimateId: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: estimate } = await supabase
      .from('estimates')
      .select(`
        id, organization_id, customer_id,
        customer:customers!customer_id(id, name, first_name, last_name, email)
      `)
      .eq('id', estimateId)
      .single()
    if (!estimate) return

    const customer = Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer

    const { data: proposalNumber } = await supabase
      .rpc('generate_proposal_number', { org_id: estimate.organization_id })
    const { data: accessToken } = await supabase
      .rpc('generate_access_token')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        organization_id: estimate.organization_id,
        estimate_id: estimateId,
        customer_id: estimate.customer_id,
        proposal_number: proposalNumber || `PRO-${Date.now()}`,
        status: 'draft',
        access_token: accessToken,
        access_token_expires_at: expiresAt.toISOString(),
        valid_until: expiresAt.toISOString().split('T')[0],
        created_by: user.id,
      })
      .select()
      .single()
    if (error || !proposal) {
      log.error({ estimateId, err: error && formatError(error) }, 'failed to create proposal')
      return
    }

    // The estimate transitions to 'sent' once a proposal exists — same rule
    // the manual POST /api/proposals path follows.
    await supabase.from('estimates').update({ status: 'sent' }).eq('id', estimateId)

    if (!customer?.email) {
      log.warn({ estimateId, proposalId: proposal.id }, 'customer has no email — proposal created but not auto-sent')
      return
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) return

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      const { data: org } = await supabase
        .from('organizations')
        .select('name, email')
        .eq('id', estimate.organization_id)
        .single()
      const fromEmail = org?.email || 'noreply@hazardos.app'
      const orgName = org?.name || 'HazardOS'
      const recipientName = customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Valued Customer'

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const portalUrl = `${appUrl}/portal/proposal/${proposal.access_token}`

      await resend.emails.send({
        from: `${orgName} <${fromEmail}>`,
        to: customer.email,
        subject: `Proposal ${proposal.proposal_number} - ${orgName}`,
        html: `
          <h1>Proposal ${proposal.proposal_number}</h1>
          <p>Dear ${recipientName},</p>
          <p>Please review your proposal by clicking the link below:</p>
          <p><a href="${portalUrl}" style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Proposal</a></p>
          <p>This link will expire on ${new Date(proposal.access_token_expires_at).toLocaleDateString()}.</p>
          <p>Thank you for your business!</p>
          <p>${orgName}</p>
        `,
      })

      await supabase
        .from('proposals')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_to_email: customer.email,
        })
        .eq('id', proposal.id)
    } catch (e) {
      log.error({ estimateId, proposalId: proposal.id, err: formatError(e) }, 'failed to send proposal email')
    }
  }

  // Looks up the current pending approval_request for an estimate (if any) so
  // the UI can render the right call-to-action ("review" vs "final approval")
  // and show who's waiting on what.
  static async getEstimateApprovalState(estimateId: string): Promise<ApprovalRequest | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('entity_type', 'estimate')
      .eq('entity_id', estimateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throwDbError(error, 'load estimate approval state')
    return (data as ApprovalRequest | null) ?? null
  }
}
