'use client';

import { ReactNode } from 'react';
import { WidgetErrorBoundary } from '@/components/error-boundaries';
import { DollarSign, Calendar, FileText, Activity } from 'lucide-react';

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
}

/**
 * Error boundary wrapper for StatsCards component
 */
export function StatsCardsErrorBoundary({ children }: ErrorBoundaryWrapperProps) {
  return (
    <WidgetErrorBoundary
      title="Key Metrics"
      height="150px"
      showCard={false}
      icon={<DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
    >
      {children}
    </WidgetErrorBoundary>
  );
}

/**
 * Error boundary wrapper for UpcomingJobs component
 */
export function UpcomingJobsErrorBoundary({ children }: ErrorBoundaryWrapperProps) {
  return (
    <WidgetErrorBoundary
      title="Upcoming Jobs"
      height="300px"
      icon={<Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
    >
      {children}
    </WidgetErrorBoundary>
  );
}

/**
 * Error boundary wrapper for OverdueInvoices component
 */
export function OverdueInvoicesErrorBoundary({ children }: ErrorBoundaryWrapperProps) {
  return (
    <WidgetErrorBoundary
      title="Overdue Invoices"
      height="300px"
      icon={<FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
    >
      {children}
    </WidgetErrorBoundary>
  );
}

/**
 * Error boundary wrapper for RecentActivity component
 */
export function RecentActivityErrorBoundary({ children }: ErrorBoundaryWrapperProps) {
  return (
    <WidgetErrorBoundary
      title="Recent Activity"
      height="300px"
      icon={<Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
    >
      {children}
    </WidgetErrorBoundary>
  );
}
