// Integration Types for HazardOS

export type IntegrationType = 'quickbooks' | 'stripe' | 'mailchimp' | 'hubspot' | 'google_calendar' | 'outlook_calendar';

export type SyncStatus = 'success' | 'partial' | 'failed';
export type SyncDirection = 'push' | 'pull' | 'both';

export interface OrganizationIntegration {
  id: string;
  organization_id: string;
  integration_type: IntegrationType;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  external_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  settings: QuickBooksSettings | Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSyncLog {
  id: string;
  organization_id: string;
  integration_type: IntegrationType;
  sync_type: string;
  direction: SyncDirection;
  status: SyncStatus;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  errors: SyncError[];
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface SyncError {
  entity_id: string;
  entity_type: string;
  error: string;
  timestamp: string;
}

export interface QuickBooksSettings {
  auto_sync_customers: boolean;
  auto_sync_invoices: boolean;
  default_income_account_id?: string;
  default_ar_account_id?: string;
}

export interface QuickBooksConnectionStatus {
  is_connected: boolean;
  company_name?: string;
  realm_id?: string;
  last_sync_at?: string;
  token_expires_at?: string;
}

export interface QuickBooksCompanyInfo {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
}

// ========== MARKETING INTEGRATION TYPES ==========

export type SegmentType = 'dynamic' | 'static';

export interface SegmentRule {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_null' | 'is_not_null';
  value?: string | number | boolean;
}

export interface CustomerSegment {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  segment_type: SegmentType;
  rules: SegmentRule[];
  member_count: number;
  last_calculated_at?: string;
  mailchimp_tag_id?: string;
  mailchimp_synced_at?: string;
  hubspot_list_id?: string;
  hubspot_synced_at?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SegmentMember {
  id: string;
  segment_id: string;
  customer_id: string;
  added_at: string;
  added_by?: string;
}

export interface MarketingSyncLog {
  id: string;
  organization_id: string;
  integration_type: 'mailchimp' | 'hubspot';
  sync_type: 'contact' | 'segment' | 'full';
  entity_id?: string;
  status: 'success' | 'failed';
  external_id?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface MailchimpSettings {
  default_list_id?: string;
  auto_sync_contacts: boolean;
  sync_tags: boolean;
}

export interface MailchimpConnectionStatus {
  is_connected: boolean;
  account_name?: string;
  data_center?: string;
  last_sync_at?: string;
}

export interface MailchimpList {
  id: string;
  name: string;
  member_count: number;
}

export interface HubSpotSettings {
  auto_sync_contacts: boolean;
  sync_companies: boolean;
  sync_deals: boolean;
}

export interface HubSpotConnectionStatus {
  is_connected: boolean;
  portal_id?: string;
  hub_domain?: string;
  last_sync_at?: string;
}

// ========== CALENDAR INTEGRATION TYPES ==========

export interface CalendarSyncEvent {
  id: string;
  organization_id: string;
  job_id?: string;
  event_type: 'job' | 'site_survey' | 'follow_up';
  google_event_id?: string;
  outlook_event_id?: string;
  calendar_type: 'google' | 'outlook';
  last_synced_at?: string;
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarSettings {
  default_calendar_id?: string;
  auto_sync_jobs: boolean;
  sync_site_surveys: boolean;
}

export interface GoogleCalendarConnectionStatus {
  is_connected: boolean;
  email?: string;
  calendar_name?: string;
  last_sync_at?: string;
}

export interface OutlookCalendarSettings {
  default_calendar_id?: string;
  auto_sync_jobs: boolean;
  sync_site_surveys: boolean;
}

export interface OutlookCalendarConnectionStatus {
  is_connected: boolean;
  email?: string;
  calendar_name?: string;
  last_sync_at?: string;
}

// ========== WEBHOOK TYPES ==========

export type WebhookEventType =
  | 'customer.created'
  | 'customer.updated'
  | 'job.created'
  | 'job.updated'
  | 'job.completed'
  | 'invoice.created'
  | 'invoice.paid'
  | 'proposal.created'
  | 'proposal.signed'
  | 'estimate.approved';

export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  secret?: string;
  events: WebhookEventType[];
  is_active: boolean;
  last_triggered_at?: string;
  failure_count: number;
  headers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  organization_id: string;
  event_type: WebhookEventType;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  status_code?: number;
  response_body?: string;
  error_message?: string;
  attempt_count: number;
  next_retry_at?: string;
  created_at: string;
  delivered_at?: string;
}

// ========== LEAD WEBHOOK TYPES ==========

export type LeadProvider = 'homeadvisor' | 'thumbtack' | 'angi' | 'custom';

export interface LeadWebhookEndpoint {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  provider: LeadProvider;
  api_key?: string;
  secret?: string;
  field_mapping: Record<string, string>;
  is_active: boolean;
  leads_received: number;
  last_lead_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadWebhookLog {
  id: string;
  endpoint_id: string;
  organization_id: string;
  raw_payload: Record<string, unknown>;
  headers?: Record<string, string>;
  ip_address?: string;
  status: 'success' | 'failed' | 'duplicate';
  error_message?: string;
  customer_id?: string;
  opportunity_id?: string;
  created_at: string;
}

// ========== API KEY TYPES ==========

export type ApiKeyScope =
  | 'customers:read'
  | 'customers:write'
  | 'jobs:read'
  | 'jobs:write'
  | 'invoices:read'
  | 'invoices:write'
  | 'estimates:read'
  | 'estimates:write';

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  rate_limit: number;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_by?: string;
  created_at: string;
  revoked_at?: string;
}

export interface ApiRequestLog {
  id: string;
  api_key_id: string;
  organization_id: string;
  method: string;
  path: string;
  status_code: number;
  response_time_ms?: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ========== WHITE-LABEL TYPES ==========

export interface WhiteLabelConfig {
  company_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  email_from_name?: string;
  email_from_domain?: string;
  hide_powered_by?: boolean;
}

export interface CustomDomain {
  id: string;
  organization_id: string;
  domain: string;
  verification_token: string;
  is_verified: boolean;
  verified_at?: string;
  ssl_status: 'pending' | 'provisioning' | 'active' | 'failed';
  dns_records: Array<{ type: string; name: string; value: string }>;
  created_at: string;
  updated_at: string;
}

// ========== LOCATION TYPES ==========

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_headquarters: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationUser {
  id: string;
  location_id: string;
  user_id: string;
  is_primary: boolean;
  can_manage: boolean;
  assigned_at: string;
  assigned_by?: string;
}

// ========== AI TYPES ==========

export interface SuggestedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  category: string;
  hazard_type?: string;
  reasoning?: string;
}

export interface EstimateSuggestion {
  id: string;
  organization_id: string;
  site_survey_id?: string;
  hazard_types: string[];
  property_type?: string;
  square_footage?: number;
  suggested_items: SuggestedLineItem[];
  total_amount: number;
  model_version?: string;
  confidence_score?: number;
  reasoning?: string;
  was_accepted?: boolean;
  accepted_at?: string;
  modified_before_accept?: boolean;
  created_at: string;
}

export interface DetectedHazard {
  type: string;
  confidence: number;
  location?: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PhotoAnalysis {
  id: string;
  organization_id: string;
  job_photo_id?: string;
  image_url?: string;
  image_hash?: string;
  property_type?: string;
  known_hazards: string[];
  detected_hazards: DetectedHazard[];
  overall_risk_level?: 'low' | 'medium' | 'high' | 'critical';
  recommendations: Array<{ action: string; priority: string }>;
  raw_analysis?: string;
  model_version?: string;
  processing_time_ms?: number;
  created_at: string;
}

export interface VoiceTranscription {
  id: string;
  organization_id: string;
  user_id?: string;
  audio_url?: string;
  audio_duration_seconds?: number;
  audio_format?: string;
  context_type?: 'site_survey_note' | 'job_note' | 'customer_note';
  context_id?: string;
  raw_transcription: string;
  processed_text?: string;
  extracted_data: Record<string, unknown>;
  transcription_model?: string;
  processing_model?: string;
  processing_time_ms?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}
