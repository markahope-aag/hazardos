/**
 * What each shipped-default template (see 20260815000001_system_message_templates.sql)
 * can reference. Distinct from the generic set an automation-step template
 * gets (customer_name, customer_full_name, company_name, city) — these six
 * are rendered by reminder-sender.ts with their own, narrower variable set
 * tied to what job-reminders-service / invoice-delivery-service actually
 * supply. Shown in the editor only for a row carrying one of these slugs, so
 * a tenant editing their copy of "Job Confirmation" isn't offered a
 * `{{invoice_number}}` that will always render blank there.
 */
export const SYSTEM_TEMPLATE_VARIABLES: Record<string, string[]> = {
  job_confirmation: [
    'customer_name',
    'company_name',
    'scheduled_date_pretty',
    'time_suffix',
    'property_address',
    'job_number',
  ],
  job_reminder_week: ['customer_name', 'company_name', 'scheduled_date_pretty', 'time_suffix', 'property_address'],
  job_reminder_day: ['customer_name', 'company_name', 'time_suffix', 'property_address'],
  payment_reminder_pre_due: ['company_name', 'invoice_number', 'amount', 'due_date', 'pay_url'],
  payment_reminder_due: ['company_name', 'invoice_number', 'amount', 'pay_url'],
  payment_reminder_overdue: ['company_name', 'invoice_number', 'amount', 'due_date', 'pay_url'],
}
