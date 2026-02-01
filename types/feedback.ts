import { ProfileRelation, CustomerRelation } from './jobs'

// Status types
export type FeedbackSurveyStatus = 'pending' | 'sent' | 'viewed' | 'completed' | 'expired'
export type ReviewRequestStatus = 'pending' | 'sent' | 'clicked' | 'completed'
export type ReviewPlatform = 'google' | 'yelp' | 'facebook' | 'bbb' | 'homeadvisor' | 'angi'

// ============================================
// Feedback Surveys
// ============================================
export interface FeedbackSurvey {
  id: string
  organization_id: string
  job_id: string
  customer_id: string
  access_token: string
  token_expires_at: string
  status: FeedbackSurveyStatus
  sent_at: string | null
  sent_to_email: string | null
  reminder_sent_at: string | null
  viewed_at: string | null
  completed_at: string | null
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
  testimonial_permission: boolean
  testimonial_approved: boolean
  testimonial_approved_at: string | null
  testimonial_approved_by: string | null
  customer_name: string | null
  customer_company: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string

  // Relations
  customer?: CustomerRelation
  job?: JobRelation
  approver?: ProfileRelation
}

export interface JobRelation {
  id: string
  job_number: string
  name: string | null
}

export interface CreateSurveyInput {
  job_id: string
  send_immediately?: boolean
  recipient_email?: string
}

export interface SubmitFeedbackInput {
  rating_overall?: number
  rating_quality?: number
  rating_communication?: number
  rating_timeliness?: number
  rating_value?: number
  would_recommend?: boolean
  likelihood_to_recommend?: number
  feedback_text?: string
  improvement_suggestions?: string
  testimonial_text?: string
  testimonial_permission?: boolean
}

// ============================================
// Review Requests
// ============================================
export interface ReviewRequest {
  id: string
  organization_id: string
  feedback_survey_id: string | null
  customer_id: string
  platform: ReviewPlatform
  platform_url: string | null
  status: ReviewRequestStatus
  sent_at: string | null
  clicked_at: string | null
  completed_at: string | null
  sent_to_email: string | null
  click_token: string | null
  created_at: string

  // Relations
  customer?: CustomerRelation
  survey?: FeedbackSurvey
}

export interface CreateReviewRequestInput {
  customer_id: string
  platform: ReviewPlatform
  platform_url?: string
  feedback_survey_id?: string
}

// ============================================
// Statistics
// ============================================
export interface FeedbackStats {
  total_surveys: number
  completed_surveys: number
  avg_overall_rating: number | null
  avg_quality_rating: number | null
  avg_communication_rating: number | null
  avg_timeliness_rating: number | null
  nps_score: number | null
  testimonials_count: number
  response_rate: number | null
}

export interface Testimonial {
  id: string
  customer_name: string | null
  customer_company: string | null
  testimonial_text: string
  rating_overall: number | null
  job_number: string
  completed_at: string
}

// ============================================
// Public Survey View (subset for token access)
// ============================================
export interface PublicSurveyView {
  id: string
  job_number: string
  job_name: string | null
  organization_name: string
  organization_logo: string | null
  customer_name: string | null
  status: FeedbackSurveyStatus
  completed_at: string | null
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
  testimonial_permission: boolean
}

// ============================================
// UI Configuration
// ============================================
export const surveyStatusConfig: Record<FeedbackSurveyStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  viewed: { label: 'Viewed', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  expired: { label: 'Expired', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export const reviewPlatformConfig: Record<ReviewPlatform, { label: string; color: string; icon: string }> = {
  google: { label: 'Google', color: 'text-blue-600', icon: 'Google' },
  yelp: { label: 'Yelp', color: 'text-red-600', icon: 'Star' },
  facebook: { label: 'Facebook', color: 'text-blue-700', icon: 'Facebook' },
  bbb: { label: 'BBB', color: 'text-blue-800', icon: 'Shield' },
  homeadvisor: { label: 'HomeAdvisor', color: 'text-orange-600', icon: 'Home' },
  angi: { label: 'Angi', color: 'text-green-600', icon: 'CheckCircle' },
}

// Rating labels for display
export const ratingLabels: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
}

export const npsLabels: Record<string, string> = {
  detractor: 'Detractor (0-6)',
  passive: 'Passive (7-8)',
  promoter: 'Promoter (9-10)',
}
