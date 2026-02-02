'use client';

import React from 'react';
import { Plug, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ErrorBoundary, ErrorBoundaryProps, FallbackProps } from './error-boundary';

export interface IntegrationErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  /** Name of the integration */
  integrationName: string;
  /** Icon to display for the integration */
  icon?: React.ReactNode;
  /** Link to the integration's settings page */
  settingsPath?: string;
  /** Link to the integration's documentation */
  docsUrl?: string;
  /** Whether to show reconnect option */
  showReconnect?: boolean;
  /** Callback to handle reconnection */
  onReconnect?: () => void;
}

/**
 * Error boundary specialized for third-party integrations.
 * Provides integration-specific error handling with reconnect options.
 *
 * @example
 * ```tsx
 * <IntegrationErrorBoundary
 *   integrationName="Google Calendar"
 *   settingsPath="/settings/integrations"
 *   showReconnect
 *   onReconnect={handleReconnect}
 * >
 *   <GoogleCalendarCard integration={integration} />
 * </IntegrationErrorBoundary>
 * ```
 */
export function IntegrationErrorBoundary({
  children,
  integrationName,
  icon,
  settingsPath,
  docsUrl,
  showReconnect = false,
  onReconnect,
  ...props
}: IntegrationErrorBoundaryProps) {
  const IntegrationFallback = ({ error, resetError }: FallbackProps) => {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                {icon || <Plug className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {integrationName}
                  <Badge variant="destructive" className="text-xs">Error</Badge>
                </CardTitle>
                <CardDescription>Integration temporarily unavailable</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error.message || `We're having trouble connecting to ${integrationName}. This might be a temporary issue with the service.`}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" onClick={resetError}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>

              {showReconnect && onReconnect && (
                <Button variant="outline" size="sm" onClick={onReconnect}>
                  <Plug className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
              )}

              {settingsPath && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={settingsPath}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
            </div>

            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View troubleshooting guide
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ErrorBoundary
      fallback={IntegrationFallback}
      name={`Integration:${integrationName}`}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

export default IntegrationErrorBoundary;
