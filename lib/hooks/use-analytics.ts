'use client';

/**
 * useAnalytics Hook
 *
 * Provides easy access to analytics tracking functions
 * within React components.
 */

import { useCallback, useRef, useEffect } from 'react';
import {
  track,
  trackFormSubmission,
  trackUserAction,
  trackFeatureUsage,
  trackError,
  trackApiPerformance,
  markPerformance,
  measurePerformance,
} from '@/lib/analytics';
import type {
  FormSubmissionEvent,
  UserActionEvent,
  FeatureUsageEvent,
  ErrorEvent,
} from '@/lib/analytics';

/**
 * Hook for tracking analytics events in React components
 */
export function useAnalytics() {
  // Track a custom event
  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, string | number | boolean | null>) => {
      track(eventName, properties);
    },
    []
  );

  // Track form submission
  const trackForm = useCallback((event: FormSubmissionEvent) => {
    trackFormSubmission(event);
  }, []);

  // Track user action
  const trackAction = useCallback((event: UserActionEvent) => {
    trackUserAction(event);
  }, []);

  // Track feature usage
  const trackFeature = useCallback((event: FeatureUsageEvent) => {
    trackFeatureUsage(event);
  }, []);

  // Track error
  const trackErr = useCallback((event: ErrorEvent) => {
    trackError(event);
  }, []);

  // Track API performance
  const trackApi = useCallback(
    (
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      statusCode: number,
      duration: number,
      success: boolean,
      errorMessage?: string
    ) => {
      trackApiPerformance({
        endpoint,
        method,
        statusCode,
        duration,
        success,
        errorMessage,
      });
    },
    []
  );

  // Performance marking
  const mark = useCallback((markName: string) => {
    markPerformance(markName);
  }, []);

  const measure = useCallback((markName: string) => {
    return measurePerformance(markName);
  }, []);

  return {
    track: trackEvent,
    trackFormSubmission: trackForm,
    trackUserAction: trackAction,
    trackFeatureUsage: trackFeature,
    trackError: trackErr,
    trackApiPerformance: trackApi,
    markPerformance: mark,
    measurePerformance: measure,
  };
}

/**
 * Hook for tracking component mount/unmount and time on page
 */
export function usePageView(
  pageName: string,
  properties?: Record<string, string | number | boolean>
) {
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();

    // Track page view on mount
    track('page_view', {
      page_name: pageName,
      ...properties,
    });

    return () => {
      // Track time on page when unmounting
      const timeOnPage = performance.now() - startTimeRef.current;
      track('page_exit', {
        page_name: pageName,
        time_on_page_ms: Math.round(timeOnPage),
        time_on_page_seconds: Math.round(timeOnPage / 1000),
      });
    };
  }, [pageName]); // Only re-run if pageName changes
}

/**
 * Hook for tracking feature usage with automatic timing
 */
export function useFeatureUsage(
  feature: FeatureUsageEvent['feature'],
  options?: { trackOnMount?: boolean }
) {
  const startTimeRef = useRef<number>(0);
  const { trackOnMount = true } = options ?? {};

  useEffect(() => {
    startTimeRef.current = performance.now();

    if (trackOnMount) {
      trackFeatureUsage({
        feature,
        action: 'view',
      });
    }
  }, [feature, trackOnMount]);

  const trackUse = useCallback(
    (success?: boolean, metadata?: Record<string, string | number | boolean>) => {
      const duration = performance.now() - startTimeRef.current;
      trackFeatureUsage({
        feature,
        action: 'use',
        success,
        duration,
        metadata,
      });
    },
    [feature]
  );

  const trackConfigure = useCallback(
    (success?: boolean, metadata?: Record<string, string | number | boolean>) => {
      trackFeatureUsage({
        feature,
        action: 'configure',
        success,
        metadata,
      });
    },
    [feature]
  );

  const trackEnable = useCallback(() => {
    trackFeatureUsage({
      feature,
      action: 'enable',
      success: true,
    });
  }, [feature]);

  const trackDisable = useCallback(() => {
    trackFeatureUsage({
      feature,
      action: 'disable',
      success: true,
    });
  }, [feature]);

  return {
    trackUse,
    trackConfigure,
    trackEnable,
    trackDisable,
  };
}

/**
 * Hook for tracking form interactions
 */
export function useFormAnalytics(
  formType: FormSubmissionEvent['formType'],
  formName: string
) {
  const startTimeRef = useRef<number>(0);
  const fieldCountRef = useRef<number>(0);

  const startTracking = useCallback((fieldCount?: number) => {
    startTimeRef.current = performance.now();
    if (fieldCount !== undefined) {
      fieldCountRef.current = fieldCount;
    }
  }, []);

  const trackSuccess = useCallback(() => {
    const duration = performance.now() - startTimeRef.current;
    trackFormSubmission({
      formType,
      formName,
      success: true,
      duration,
      fieldCount: fieldCountRef.current || undefined,
    });
  }, [formType, formName]);

  const trackFailure = useCallback(
    (errorType?: string) => {
      const duration = performance.now() - startTimeRef.current;
      trackFormSubmission({
        formType,
        formName,
        success: false,
        duration,
        errorType,
        fieldCount: fieldCountRef.current || undefined,
      });
    },
    [formType, formName]
  );

  return {
    startTracking,
    trackSuccess,
    trackFailure,
  };
}

/**
 * Hook for tracking widget interactions on dashboards
 */
export function useWidgetAnalytics(widgetName: string) {
  const trackInteraction = useCallback(
    (action: 'view' | 'expand' | 'collapse' | 'refresh' | 'configure' | 'interact') => {
      track('widget_interaction', {
        widget_name: widgetName,
        action,
      });
    },
    [widgetName]
  );

  useEffect(() => {
    // Track widget view on mount
    trackInteraction('view');
  }, [trackInteraction]);

  return {
    trackExpand: () => trackInteraction('expand'),
    trackCollapse: () => trackInteraction('collapse'),
    trackRefresh: () => trackInteraction('refresh'),
    trackConfigure: () => trackInteraction('configure'),
    trackInteract: () => trackInteraction('interact'),
  };
}

/**
 * Hook for tracking render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    const currentTime = performance.now();
    const renderDuration = currentTime - lastRenderTime.current;
    renderCount.current += 1;

    // Only track after initial render and if render took noticeable time
    if (renderCount.current > 1 && renderDuration > 16) {
      track('component_render', {
        component: componentName,
        render_count: renderCount.current,
        duration_ms: Math.round(renderDuration),
      });
    }

    lastRenderTime.current = currentTime;
  });
}
