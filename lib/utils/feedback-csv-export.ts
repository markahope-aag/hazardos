import { escapeCSVValue } from '@/lib/utils/sanitize'
import type { FeedbackSurvey } from '@/types/feedback'

const CSV_COLUMNS: { label: string; field: (s: FeedbackSurvey) => string }[] = [
  { label: 'Completed At', field: (s) => s.completed_at || '' },
  { label: 'Job', field: (s) => s.job?.job_number || '' },
  { label: 'Customer', field: (s) => s.customer_name || s.customer?.name || '' },
  { label: 'Company', field: (s) => s.customer_company || s.customer?.company_name || '' },
  { label: 'Overall', field: (s) => String(s.rating_overall ?? '') },
  { label: 'Quality', field: (s) => String(s.rating_quality ?? '') },
  { label: 'Communication', field: (s) => String(s.rating_communication ?? '') },
  { label: 'Timeliness', field: (s) => String(s.rating_timeliness ?? '') },
  { label: 'Value', field: (s) => String(s.rating_value ?? '') },
  { label: 'NPS (0-10)', field: (s) => String(s.likelihood_to_recommend ?? '') },
  { label: 'Would Recommend', field: (s) => (s.would_recommend == null ? '' : s.would_recommend ? 'Yes' : 'No') },
  { label: 'Feedback', field: (s) => s.feedback_text || '' },
  { label: 'Improvements', field: (s) => s.improvement_suggestions || '' },
  { label: 'Testimonial', field: (s) => s.testimonial_text || '' },
  { label: 'Testimonial Approved', field: (s) => (s.testimonial_approved ? 'Yes' : 'No') },
]

// Shared by the API export route (FB7) so the column set never drifts.
export function feedbackResponsesToCsv(surveys: FeedbackSurvey[]): string {
  const header = CSV_COLUMNS.map((col) => escapeCSVValue(col.label)).join(',')
  const rows = surveys.map((survey) =>
    CSV_COLUMNS.map((col) => escapeCSVValue(col.field(survey))).join(','),
  )
  return [header, ...rows].join('\r\n')
}
