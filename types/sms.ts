// SMS Types for HazardOS

export type SmsStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'undelivered';

export type SmsMessageType =
  | 'appointment_reminder'
  | 'job_status'
  | 'lead_notification'
  | 'payment_reminder'
  | 'estimate_follow_up'
  | 'general';

export interface OrganizationSmsSettings {
  id: string;
  organization_id: string;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_phone_number: string | null;
  use_platform_twilio: boolean;
  sms_enabled: boolean;
  appointment_reminders_enabled: boolean;
  appointment_reminder_hours: number;
  job_status_updates_enabled: boolean;
  lead_notifications_enabled: boolean;
  payment_reminders_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface SmsMessage {
  id: string;
  organization_id: string;
  customer_id: string | null;
  to_phone: string;
  message_type: SmsMessageType;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  twilio_message_sid: string | null;
  status: SmsStatus;
  error_code: string | null;
  error_message: string | null;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  segments: number;
  cost: number | null;
}

export interface SmsTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  message_type: SmsMessageType;
  body: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendSmsInput {
  to: string;
  body: string;
  message_type: SmsMessageType;
  customer_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface SendTemplatedSmsInput {
  to: string;
  template_type: SmsMessageType;
  variables: Record<string, string>;
  customer_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface SmsSettingsUpdateInput {
  sms_enabled?: boolean;
  appointment_reminders_enabled?: boolean;
  appointment_reminder_hours?: number;
  job_status_updates_enabled?: boolean;
  lead_notifications_enabled?: boolean;
  payment_reminders_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  use_platform_twilio?: boolean;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
}
