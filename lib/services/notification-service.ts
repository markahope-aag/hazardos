import { createClient } from '@/lib/supabase/server'
import type {
  Notification,
  NotificationPreference,
  CreateNotificationInput,
  CreateNotificationForRoleInput,
  UpdatePreferenceInput,
  NotificationType,
} from '@/types/notifications'

export class NotificationService {
  // ========== NOTIFICATIONS ==========

  static async create(input: CreateNotificationInput): Promise<Notification> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Check user preferences before creating
    const { data: preference } = await supabase
      .from('notification_preferences')
      .select('in_app')
      .eq('user_id', input.user_id)
      .eq('notification_type', input.type)
      .single()

    // Skip if user has disabled in-app notifications for this type
    if (preference && !preference.in_app) {
      // Still try to send email if enabled
      await NotificationService.sendEmailNotification(input, profile.organization_id)
      return {} as Notification // Return empty object to indicate skipped
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        organization_id: profile.organization_id,
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        message: input.message,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        action_url: input.action_url,
        action_label: input.action_label,
        priority: input.priority || 'normal',
        metadata: input.metadata || {},
        expires_at: input.expires_at,
      })
      .select()
      .single()

    if (error) throw error

    // Try to send email notification
    await NotificationService.sendEmailNotification(input, profile.organization_id)

    return data
  }

  static async createForRole(input: CreateNotificationForRoleInput): Promise<Notification[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const { data, error } = await supabase.rpc('create_notification_for_role', {
      p_organization_id: profile.organization_id,
      p_role: input.role,
      p_type: input.type,
      p_title: input.title,
      p_message: input.message,
      p_entity_type: input.entity_type,
      p_entity_id: input.entity_id,
      p_action_url: input.action_url,
      p_priority: input.priority || 'normal',
    })

    if (error) throw error

    return data || []
  }

  static async getUnread(userId?: string): Promise<Notification[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const targetUserId = userId || user.id

    const { data, error } = await supabase
      .from('notifications')
      .select('id, organization_id, user_id, type, title, message, entity_type, entity_id, action_url, action_label, priority, is_read, read_at, created_at, expires_at, metadata')
      .eq('user_id', targetUserId)
      .eq('is_read', false)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return data || []
  }

  static async getAll(userId?: string, limit: number = 50): Promise<Notification[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const targetUserId = userId || user.id

    const { data, error } = await supabase
      .from('notifications')
      .select('id, organization_id, user_id, type, title, message, entity_type, entity_id, action_url, action_label, priority, is_read, read_at, created_at, expires_at, metadata')
      .eq('user_id', targetUserId)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  }

  static async getUnreadCount(userId?: string): Promise<number> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const targetUserId = userId || user.id

    const { data, error } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: targetUserId })

    if (error) throw error

    return data || 0
  }

  static async markAsRead(id: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
  }

  static async markAllAsRead(): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
  }

  // ========== PREFERENCES ==========

  static async getPreferences(): Promise<NotificationPreference[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Initialize preferences if not exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      await supabase.rpc('initialize_notification_preferences', {
        p_user_id: user.id,
        p_org_id: profile.organization_id,
      })
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('id, user_id, notification_type, in_app, email, push, created_at, updated_at')
      .eq('user_id', user.id)
      .order('notification_type')

    if (error) throw error

    return data || []
  }

  static async updatePreference(input: UpdatePreferenceInput): Promise<NotificationPreference> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const updateData: Record<string, unknown> = {}
    if (input.in_app !== undefined) updateData.in_app = input.in_app
    if (input.email !== undefined) updateData.email = input.email
    if (input.push !== undefined) updateData.push = input.push

    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('notification_type', input.notification_type)
      .select()
      .single()

    if (error) throw error

    return data
  }

  // ========== EMAIL ==========

  static async sendEmailNotification(
    input: CreateNotificationInput,
    organizationId: string
  ): Promise<void> {
    const supabase = await createClient()

    // Check if user wants email for this type
    const { data: preference } = await supabase
      .from('notification_preferences')
      .select('email')
      .eq('user_id', input.user_id)
      .eq('notification_type', input.type)
      .single()

    if (preference && !preference.email) {
      return // User doesn't want email notifications
    }

    // Get user email and organization info
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', input.user_id)
      .single()

    if (!userProfile?.email) return

    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    // Send email via Resend (if configured)
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) return

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      const actionButton = input.action_url
        ? `<p style="margin-top: 20px;"><a href="${process.env.NEXT_PUBLIC_APP_URL}${input.action_url}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">${input.action_label || 'View Details'}</a></p>`
        : ''

      await resend.emails.send({
        from: `${organization?.name || 'HazardOS'} <notifications@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
        to: userProfile.email,
        subject: input.title,
        html: `
          <h1>${input.title}</h1>
          ${input.message ? `<p>${input.message}</p>` : ''}
          ${actionButton}
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 12px; color: #6b7280;">
            This notification was sent from ${organization?.name || 'HazardOS'}.
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications">Manage notification settings</a>
          </p>
        `,
      })

      // Update notification to mark email as sent
      if (input.user_id) {
        // Note: We don't have the notification ID here, but we can skip this update
      }
    } catch (error) {
      console.error('Failed to send notification email:', error)
    }
  }
}

// ========== CONVENIENCE FUNCTION ==========

export async function notify(
  type: NotificationType,
  userId: string,
  options: {
    title: string
    message?: string
    entityType?: string
    entityId?: string
    actionUrl?: string
    actionLabel?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }
): Promise<Notification | null> {
  try {
    return await NotificationService.create({
      user_id: userId,
      type,
      title: options.title,
      message: options.message,
      entity_type: options.entityType,
      entity_id: options.entityId,
      action_url: options.actionUrl,
      action_label: options.actionLabel,
      priority: options.priority,
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
    return null
  }
}

// ========== NOTIFICATION HELPERS FOR COMMON EVENTS ==========

export const NotificationHelpers = {
  async jobAssigned(jobId: string, jobNumber: string, assignedUserId: string): Promise<void> {
    await notify('job_assigned', assignedUserId, {
      title: 'You have been assigned to a job',
      message: `You have been assigned to job ${jobNumber}`,
      entityType: 'job',
      entityId: jobId,
      actionUrl: `/jobs/${jobId}`,
      actionLabel: 'View Job',
    })
  },

  async jobCompletionSubmitted(
    jobId: string,
    jobNumber: string,
    adminUserIds: string[]
  ): Promise<void> {
    for (const userId of adminUserIds) {
      await notify('job_completion_review', userId, {
        title: 'Job completion needs review',
        message: `Job ${jobNumber} has been completed and needs your review`,
        entityType: 'job',
        entityId: jobId,
        actionUrl: `/jobs/${jobId}/review`,
        actionLabel: 'Review Completion',
        priority: 'high',
      })
    }
  },

  async proposalSigned(
    proposalId: string,
    proposalNumber: string,
    ownerUserId: string
  ): Promise<void> {
    await notify('proposal_signed', ownerUserId, {
      title: 'Proposal signed!',
      message: `Proposal ${proposalNumber} has been signed by the customer`,
      entityType: 'proposal',
      entityId: proposalId,
      actionUrl: `/proposals/${proposalId}`,
      actionLabel: 'View Proposal',
      priority: 'high',
    })
  },

  async invoicePaid(
    invoiceId: string,
    invoiceNumber: string,
    amount: number,
    ownerUserId: string
  ): Promise<void> {
    await notify('invoice_paid', ownerUserId, {
      title: 'Invoice paid!',
      message: `Invoice ${invoiceNumber} has been paid ($${amount.toFixed(2)})`,
      entityType: 'invoice',
      entityId: invoiceId,
      actionUrl: `/invoices/${invoiceId}`,
      actionLabel: 'View Invoice',
      priority: 'high',
    })
  },

  async feedbackReceived(
    surveyId: string,
    jobNumber: string,
    rating: number,
    adminUserIds: string[]
  ): Promise<void> {
    for (const userId of adminUserIds) {
      await notify('feedback_received', userId, {
        title: 'New customer feedback received',
        message: `Customer feedback for job ${jobNumber} - ${rating}/5 stars`,
        entityType: 'feedback_survey',
        entityId: surveyId,
        actionUrl: `/feedback/${surveyId}`,
        actionLabel: 'View Feedback',
      })
    }
  },
}
