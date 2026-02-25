/**
 * Event Tracking Functions
 *
 * Provides functions for tracking various types of events
 * throughout the application.
 */

import { track as vercelTrack } from '@vercel/analytics';
import { shouldTrack, sanitizeProperties, isExcludedPath } from './config';
import { createServiceLogger, formatError } from '@/lib/utils/logger';
import type {
  FormSubmissionEvent,
  UserActionEvent,
  FeatureUsageEvent,
  ErrorEvent,
} from './types';

const log = createServiceLogger('Analytics');

/**
 * Track a custom event
 */
export function track(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  if (!shouldTrack()) {
    return;
  }

  try {
    const sanitizedProps = properties
      ? sanitizeProperties(properties)
      : undefined;

    vercelTrack(eventName, sanitizedProps);

    log.debug(
      { eventName, properties: sanitizedProps },
      'Analytics event tracked'
    );
  } catch (error) {
    // Silently fail - analytics should never break the app
    log.error(
      { 
        error: formatError(error, 'ANALYTICS_TRACK_ERROR'),
        eventName,
        properties: sanitizedProps
      },
      'Failed to track event'
    );
  }
}

/**
 * Track form submission events
 */
export function trackFormSubmission(event: FormSubmissionEvent): void {
  track('form_submission', {
    form_type: event.formType,
    form_name: event.formName,
    success: event.success,
    duration_ms: event.duration ?? null,
    error_type: event.errorType ?? null,
    field_count: event.fieldCount ?? null,
  });
}

/**
 * Track user action events
 */
export function trackUserAction(event: UserActionEvent): void {
  track('user_action', {
    action: event.action,
    entity_type: event.entityType ?? null,
    entity_id: event.entityId ?? null,
    ...sanitizeProperties(event.metadata ?? {}),
  });
}

/**
 * Track feature usage events
 */
export function trackFeatureUsage(event: FeatureUsageEvent): void {
  track('feature_usage', {
    feature: event.feature,
    action: event.action,
    success: event.success ?? null,
    duration_ms: event.duration ?? null,
    ...sanitizeProperties(event.metadata ?? {}),
  });
}

/**
 * Track error events
 */
export function trackError(event: ErrorEvent): void {
  // Don't include stack traces in production for security
  const safeStackTrace =
    process.env.NODE_ENV === 'development' ? event.stackTrace : undefined;

  track('error', {
    error_type: event.errorType,
    error_message: event.errorMessage.slice(0, 200), // Limit message length
    error_code: event.errorCode?.toString() ?? null,
    component: event.component ?? null,
    action: event.action ?? null,
    stack_trace: safeStackTrace?.slice(0, 500) ?? null,
    ...sanitizeProperties(event.metadata ?? {}),
  });
}

/**
 * Track page view (use with caution - Vercel Analytics handles this automatically)
 * Only use for custom page tracking scenarios
 */
export function trackPageView(
  path: string,
  properties?: Record<string, string | number | boolean>
): void {
  if (!shouldTrack() || isExcludedPath(path)) {
    return;
  }

  track('custom_page_view', {
    path,
    referrer: typeof document !== 'undefined' ? document.referrer : null,
    ...sanitizeProperties(properties ?? {}),
  });
}

/**
 * Track search events
 */
export function trackSearch(
  query: string,
  resultCount: number,
  category?: string
): void {
  track('search', {
    // Hash the query for privacy if it might contain sensitive info
    query_length: query.length,
    result_count: resultCount,
    category: category ?? null,
  });
}

/**
 * Track navigation events
 */
export function trackNavigation(
  from: string,
  to: string,
  method: 'click' | 'keyboard' | 'programmatic' = 'click'
): void {
  track('navigation', {
    from_path: from,
    to_path: to,
    method,
  });
}

/**
 * Track widget interactions on dashboard
 */
export function trackWidgetInteraction(
  widgetName: string,
  action: 'view' | 'expand' | 'collapse' | 'refresh' | 'configure' | 'interact'
): void {
  track('widget_interaction', {
    widget_name: widgetName,
    action,
  });
}

/**
 * Track button clicks
 */
export function trackButtonClick(
  buttonName: string,
  location: string,
  metadata?: Record<string, string | number | boolean>
): void {
  track('button_click', {
    button_name: buttonName,
    location,
    ...sanitizeProperties(metadata ?? {}),
  });
}
