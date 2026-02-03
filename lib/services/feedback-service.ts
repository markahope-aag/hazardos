import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import type {
  FeedbackSurvey,
  ReviewRequest,
  CreateSurveyInput,
  SubmitFeedbackInput,
  CreateReviewRequestInput,
  FeedbackStats,
  Testimonial,
  PublicSurveyView,
} from '@/types/feedback'

export class FeedbackService {
  // ========== SURVEYS ==========

  static async createSurvey(input: CreateSurveyInput): Promise<FeedbackSurvey> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Get job and customer info
    const { data: job } = await supabase
      .from('jobs')
      .select('id, job_number, name, customer_id, customer:customers(id, name, company_name, email)')
      .eq('id', input.job_id)
      .single()

    if (!job) throw new Error('Job not found')

    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer

    // Generate token
    const { data: token } = await supabase.rpc('generate_feedback_token')

    // Set expiration (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data, error } = await supabase
      .from('feedback_surveys')
      .insert({
        organization_id: profile.organization_id,
        job_id: input.job_id,
        customer_id: job.customer_id,
        access_token: token,
        token_expires_at: expiresAt.toISOString(),
        status: 'pending',
        customer_name: customer?.name,
        customer_company: customer?.company_name,
      })
      .select()
      .single()

    if (error) throw error

    await Activity.created('feedback_survey', data.id, `Survey for ${job.job_number}`)

    // Send immediately if requested
    if (input.send_immediately) {
      const recipientEmail = input.recipient_email || customer?.email
      if (recipientEmail) {
        await FeedbackService.sendSurvey(data.id, recipientEmail)
      }
    }

    return data
  }

  static async getSurvey(id: string): Promise<FeedbackSurvey | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('feedback_surveys')
      .select(`
        *,
        customer:customers(id, name, company_name, email),
        job:jobs(id, job_number, name),
        approver:profiles!feedback_surveys_testimonial_approved_by_fkey(id, full_name)
      `)
      .eq('id', id)
      .single()

    if (error) return null

    return {
      ...data,
      customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
      job: Array.isArray(data.job) ? data.job[0] : data.job,
      approver: Array.isArray(data.approver) ? data.approver[0] : data.approver,
    }
  }

  static async getSurveyByToken(token: string): Promise<PublicSurveyView | null> {
    const supabase = await createClient()

    // Use secure RPC function that validates token at database level
    // This prevents direct table access bypass
    const { data: result, error } = await supabase
      .rpc('get_feedback_survey_by_token', { p_token: token })

    if (error || !result) return null

    const response = result as {
      success: boolean
      error?: string
      survey?: {
        id: string
        status: string
        expires_at: string
        rating_overall: number | null
        rating_quality: number | null
        rating_communication: number | null
        rating_timeliness: number | null
        rating_value: number | null
        would_recommend: boolean | null
        likelihood_to_recommend: number | null
        feedback_text: string | null
        improvement_suggestions: string | null
        testimonial_text: string | null
        testimonial_permission: boolean | null
        job_number: string
        organization_name: string
        organization_logo: string | null
        customer_first_name: string | null
      }
    }

    if (!response.success || !response.survey) {
      return null
    }

    const survey = response.survey

    return {
      id: survey.id,
      job_number: survey.job_number || '',
      job_name: null,
      organization_name: survey.organization_name || '',
      organization_logo: survey.organization_logo,
      customer_name: survey.customer_first_name,
      status: survey.status as 'pending' | 'sent' | 'viewed' | 'completed' | 'expired',
      completed_at: survey.status === 'completed' ? new Date().toISOString() : null,
      rating_overall: survey.rating_overall,
      rating_quality: survey.rating_quality,
      rating_communication: survey.rating_communication,
      rating_timeliness: survey.rating_timeliness,
      rating_value: survey.rating_value,
      would_recommend: survey.would_recommend,
      likelihood_to_recommend: survey.likelihood_to_recommend,
      feedback_text: survey.feedback_text,
      improvement_suggestions: survey.improvement_suggestions,
      testimonial_text: survey.testimonial_text,
      testimonial_permission: survey.testimonial_permission ?? false,
    }
  }

  static async submitFeedback(
    token: string,
    input: SubmitFeedbackInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<FeedbackSurvey> {
    const supabase = await createClient()

    // Use secure RPC function that validates token at database level
    // This prevents direct table access bypass and ensures token validation
    const { data: result, error } = await supabase
      .rpc('submit_feedback', {
        p_token: token,
        p_rating_overall: input.rating_overall,
        p_rating_quality: input.rating_quality ?? null,
        p_rating_communication: input.rating_communication ?? null,
        p_rating_timeliness: input.rating_timeliness ?? null,
        p_rating_value: input.rating_value ?? null,
        p_would_recommend: input.would_recommend ?? null,
        p_likelihood_to_recommend: input.likelihood_to_recommend ?? null,
        p_feedback_text: input.feedback_text ?? null,
        p_improvement_suggestions: input.improvement_suggestions ?? null,
        p_testimonial_text: input.testimonial_text ?? null,
        p_testimonial_permission: input.testimonial_permission ?? false,
        p_ip_address: ipAddress ?? null,
        p_user_agent: userAgent ?? null,
      })

    if (error) throw error

    const response = result as {
      success: boolean
      error?: string
      survey_id?: string
      status?: string
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to submit feedback')
    }

    // Return minimal survey data (caller doesn't need full details)
    return {
      id: response.survey_id!,
      status: response.status || 'completed',
    } as FeedbackSurvey
  }

  static async sendSurvey(surveyId: string, recipientEmail?: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Get survey with job and org info
    const { data: survey } = await supabase
      .from('feedback_surveys')
      .select(`
        *,
        job:jobs(job_number, name),
        customer:customers(name, email),
        organization:organizations(name, email)
      `)
      .eq('id', surveyId)
      .single()

    if (!survey) throw new Error('Survey not found')

    const customer = Array.isArray(survey.customer) ? survey.customer[0] : survey.customer
    const job = Array.isArray(survey.job) ? survey.job[0] : survey.job
    const organization = Array.isArray(survey.organization) ? survey.organization[0] : survey.organization

    const email = recipientEmail || customer?.email
    if (!email) throw new Error('No recipient email')

    // Send email via Resend (if configured)
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(resendApiKey)

        const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${survey.access_token}`

        await resend.emails.send({
          from: `${organization?.name || 'HazardOS'} <feedback@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
          to: email,
          subject: `How was your experience? - ${job?.job_number}`,
          html: `
            <h1>We'd love your feedback!</h1>
            <p>Hi ${survey.customer_name || 'Valued Customer'},</p>
            <p>Thank you for choosing ${organization?.name}. We recently completed job ${job?.job_number}${job?.name ? ` (${job.name})` : ''} and would love to hear about your experience.</p>
            <p>Your feedback helps us improve our services and serve you better.</p>
            <p><a href="${surveyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Share Your Feedback</a></p>
            <p>This survey takes less than 2 minutes to complete.</p>
            <p>Thank you for your time!</p>
            <p>Best regards,<br>${organization?.name}</p>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send feedback email:', emailError)
      }
    }

    // Update survey status
    await supabase
      .from('feedback_surveys')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to_email: email,
      })
      .eq('id', surveyId)

    await Activity.sent('feedback_survey', surveyId)
  }

  static async listSurveys(filters?: {
    status?: string
    job_id?: string
    customer_id?: string
    limit?: number
    offset?: number
  }): Promise<{ surveys: FeedbackSurvey[]; total: number; limit: number; offset: number }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    let query = supabase
      .from('feedback_surveys')
      .select(`
        *,
        customer:customers(id, name, company_name),
        job:jobs(id, job_number, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.job_id) {
      query = query.eq('job_id', filters.job_id)
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const surveys = (data || []).map(survey => ({
      ...survey,
      customer: Array.isArray(survey.customer) ? survey.customer[0] : survey.customer,
      job: Array.isArray(survey.job) ? survey.job[0] : survey.job,
    }))

    return { surveys, total: count || 0, limit, offset }
  }

  // ========== TESTIMONIALS ==========

  static async approveTestimonial(surveyId: string): Promise<FeedbackSurvey> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('feedback_surveys')
      .update({
        testimonial_approved: true,
        testimonial_approved_at: new Date().toISOString(),
        testimonial_approved_by: user.id,
      })
      .eq('id', surveyId)
      .select()
      .single()

    if (error) throw error

    await Activity.updated('feedback_survey', surveyId, 'Testimonial approved')

    return data
  }

  static async rejectTestimonial(surveyId: string): Promise<FeedbackSurvey> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('feedback_surveys')
      .update({
        testimonial_approved: false,
        testimonial_approved_at: null,
        testimonial_approved_by: null,
      })
      .eq('id', surveyId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  static async getApprovedTestimonials(): Promise<Testimonial[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('feedback_surveys')
      .select(`
        id,
        customer_name,
        customer_company,
        testimonial_text,
        rating_overall,
        completed_at,
        job:jobs(job_number)
      `)
      .eq('testimonial_approved', true)
      .not('testimonial_text', 'is', null)
      .order('completed_at', { ascending: false })

    if (error) throw error

    return (data || []).map(survey => {
      const job = Array.isArray(survey.job) ? survey.job[0] : survey.job
      return {
        id: survey.id,
        customer_name: survey.customer_name,
        customer_company: survey.customer_company,
        testimonial_text: survey.testimonial_text!,
        rating_overall: survey.rating_overall,
        job_number: job?.job_number || '',
        completed_at: survey.completed_at!,
      }
    })
  }

  // ========== STATISTICS ==========

  static async getFeedbackStats(): Promise<FeedbackStats> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const { data, error } = await supabase
      .rpc('get_feedback_stats', { org_id: profile.organization_id })
      .single()

    if (error) throw error

    const stats = data as {
      total_surveys?: number
      completed_surveys?: number
      avg_overall_rating?: number
      avg_quality_rating?: number
      avg_communication_rating?: number
      avg_timeliness_rating?: number
      nps_score?: number
      testimonials_count?: number
      response_rate?: number
    } | null

    return {
      total_surveys: Number(stats?.total_surveys) || 0,
      completed_surveys: Number(stats?.completed_surveys) || 0,
      avg_overall_rating: stats?.avg_overall_rating ? Number(stats.avg_overall_rating) : null,
      avg_quality_rating: stats?.avg_quality_rating ? Number(stats.avg_quality_rating) : null,
      avg_communication_rating: stats?.avg_communication_rating ? Number(stats.avg_communication_rating) : null,
      avg_timeliness_rating: stats?.avg_timeliness_rating ? Number(stats.avg_timeliness_rating) : null,
      nps_score: stats?.nps_score ? Number(stats.nps_score) : null,
      testimonials_count: Number(stats?.testimonials_count) || 0,
      response_rate: stats?.response_rate ? Number(stats.response_rate) : null,
    }
  }

  // ========== REVIEW REQUESTS ==========

  static async createReviewRequest(input: CreateReviewRequestInput): Promise<ReviewRequest> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Generate click token
    const clickToken = crypto.randomUUID().replace(/-/g, '')

    const { data, error } = await supabase
      .from('review_requests')
      .insert({
        organization_id: profile.organization_id,
        customer_id: input.customer_id,
        platform: input.platform,
        platform_url: input.platform_url,
        feedback_survey_id: input.feedback_survey_id,
        click_token: clickToken,
      })
      .select()
      .single()

    if (error) throw error

    return data
  }

  static async trackReviewClick(clickToken: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('review_requests')
      .update({
        status: 'clicked',
        clicked_at: new Date().toISOString(),
      })
      .eq('click_token', clickToken)
  }
}
