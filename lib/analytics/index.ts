/**
 * Analytics Module - Application Performance Monitoring
 *
 * Provides centralized analytics tracking using Vercel Analytics
 * with custom event tracking for business metrics.
 */

// Client-side tracking functions
export { track, trackFormSubmission, trackUserAction, trackFeatureUsage, trackError } from './track';
export { trackApiPerformance, trackDatabaseQuery, markPerformance, measurePerformance } from './performance';

// Configuration utilities
export { shouldTrack, sanitizeProperties, isExcludedPath } from './config';

// Type exports
export type {
  TrackingEvent,
  FormSubmissionEvent,
  UserActionEvent,
  FeatureUsageEvent,
  ErrorEvent,
  PerformanceMetric,
  WebVitalsMetric,
  ApiPerformanceData,
  DatabaseQueryData,
  AnalyticsConfig,
} from './types';
