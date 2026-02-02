'use client';

/**
 * Analytics Provider Component
 *
 * Wraps the application with Vercel Analytics and Speed Insights
 * for automatic page view tracking and Web Vitals monitoring.
 */

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useEffect } from 'react';
import { track } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Custom error boundary handler for analytics
 */
function handleError(error: Error) {
  // Track client-side errors
  track('client_error', {
    error_message: error.message.slice(0, 200),
    error_name: error.name,
    stack_trace: error.stack?.slice(0, 500) ?? null,
  });
}

/**
 * Track unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);

  track('unhandled_rejection', {
    error_message: message.slice(0, 200),
  });
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    // Set up global error tracking
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (error) {
        handleError(error);
      } else {
        track('window_error', {
          error_message: String(message).slice(0, 200),
          source: source ?? null,
          line: lineno ?? null,
          column: colno ?? null,
        });
      }

      // Call original handler if it exists
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Track session start
    const sessionStart = sessionStorage.getItem('analytics_session_start');
    if (!sessionStart) {
      sessionStorage.setItem('analytics_session_start', Date.now().toString());
      track('session_start', {
        referrer: document.referrer || null,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      });
    }

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        track('page_hidden', {
          path: window.location.pathname,
        });
      } else {
        track('page_visible', {
          path: window.location.pathname,
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.onerror = originalOnError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      {children}
      <Analytics
        mode={process.env.NODE_ENV === 'production' ? 'production' : 'development'}
        debug={process.env.NODE_ENV === 'development'}
      />
      <SpeedInsights
        debug={process.env.NODE_ENV === 'development'}
      />
    </>
  );
}
