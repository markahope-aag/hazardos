/**
 * Analytics Type Definitions
 *
 * Defines the shape of all analytics events and metrics
 * for type-safe tracking throughout the application.
 */

/**
 * Base tracking event structure
 */
export interface TrackingEvent {
  name: string;
  properties?: Record<string, string | number | boolean | null>;
  timestamp?: number;
}

/**
 * Form submission tracking event
 */
export interface FormSubmissionEvent {
  formType: 'estimate' | 'proposal' | 'invoice' | 'customer' | 'job' | 'contact' | 'settings' | 'other';
  formName: string;
  success: boolean;
  duration?: number;
  errorType?: string;
  fieldCount?: number;
}

/**
 * User action tracking event
 */
export interface UserActionEvent {
  action:
    | 'create_customer'
    | 'update_customer'
    | 'delete_customer'
    | 'create_job'
    | 'schedule_job'
    | 'complete_job'
    | 'create_estimate'
    | 'send_estimate'
    | 'create_proposal'
    | 'send_proposal'
    | 'create_invoice'
    | 'send_invoice'
    | 'payment_received'
    | 'upload_document'
    | 'generate_report'
    | 'export_data'
    | 'import_data'
    | 'user_login'
    | 'user_logout'
    | 'settings_update'
    | 'other';
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Feature usage tracking event
 */
export interface FeatureUsageEvent {
  feature:
    | 'ai_assistant'
    | 'ai_estimate_generator'
    | 'ai_proposal_writer'
    | 'ai_report_generator'
    | 'quickbooks_sync'
    | 'google_calendar_sync'
    | 'outlook_sync'
    | 'email_integration'
    | 'sms_notifications'
    | 'portal_access'
    | 'mobile_app'
    | 'offline_mode'
    | 'bulk_actions'
    | 'advanced_search'
    | 'custom_reports'
    | 'api_access'
    | 'other';
  action: 'view' | 'use' | 'configure' | 'enable' | 'disable';
  success?: boolean;
  duration?: number;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Error tracking event
 */
export interface ErrorEvent {
  errorType: 'api' | 'validation' | 'auth' | 'network' | 'database' | 'integration' | 'unknown';
  errorMessage: string;
  errorCode?: string | number;
  component?: string;
  action?: string;
  userId?: string;
  stackTrace?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Performance metric event
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count' | 'percent';
  category: 'api' | 'database' | 'render' | 'network' | 'custom';
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Web Vitals metrics
 */
export interface WebVitalsMetric {
  id: string;
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

/**
 * API performance tracking data
 */
export interface ApiPerformanceData {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  statusCode: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Database query tracking data
 */
export interface DatabaseQueryData {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  duration: number;
  rowCount?: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  sampleRate: number;
  respectDoNotTrack: boolean;
  excludePaths: string[];
}
