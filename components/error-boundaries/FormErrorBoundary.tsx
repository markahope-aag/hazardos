'use client';

import React from 'react';
import { FileWarning, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { ErrorBoundary, ErrorBoundaryProps, FallbackProps } from './ErrorBoundary';

export interface FormErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  /** Form name for error messages */
  formName?: string;
  /** Path to navigate back to */
  backPath?: string;
  /** Label for the back button */
  backLabel?: string;
  /** Whether to show a back navigation option */
  showBackOption?: boolean;
}

/**
 * Error boundary specialized for forms and data entry components.
 * Provides form-specific error messaging and navigation options.
 *
 * @example
 * ```tsx
 * <FormErrorBoundary formName="Customer" backPath="/customers">
 *   <CustomerForm customer={customer} />
 * </FormErrorBoundary>
 * ```
 */
export function FormErrorBoundary({
  children,
  formName = 'Form',
  backPath,
  backLabel = 'Go back',
  showBackOption = true,
  ...props
}: FormErrorBoundaryProps) {
  const FormFallback = ({ error, resetError }: FallbackProps) => {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>{formName} Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              {error.message || `We encountered an error loading the ${formName.toLowerCase()}. This may be due to invalid data or a temporary issue.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={resetError}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Try again
              </Button>
              {showBackOption && backPath && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={backPath}>
                    <Home className="h-3 w-3 mr-1" />
                    {backLabel}
                  </Link>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">What you can try:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- Refresh the page and try again</li>
            <li>- Check your internet connection</li>
            <li>- Clear your browser cache</li>
            <li>- If the problem persists, contact support</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      fallback={FormFallback}
      name={`Form:${formName}`}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

export default FormErrorBoundary;
