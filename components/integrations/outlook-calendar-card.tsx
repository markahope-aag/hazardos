'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  AlertCircle,
  CalendarDays
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { OrganizationIntegration } from '@/types/integrations';

interface OutlookCalendarCardProps {
  integration: OrganizationIntegration | null;
}

export function OutlookCalendarCard({ integration }: OutlookCalendarCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isConnected = integration?.is_active;

  // Handle success/error from callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'outlook_calendar') {
      toast({ title: 'Success', description: 'Outlook Calendar connected successfully!' });
      router.replace('/settings/integrations');
    } else if (error && searchParams.get('integration') === 'outlook_calendar') {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect Outlook Calendar: ${error}`,
        variant: 'destructive'
      });
      router.replace('/settings/integrations');
    }
  }, [searchParams, toast, router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/integrations/outlook-calendar/connect');
      const { url, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      window.location.href = url;
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to initiate connection',
        variant: 'destructive'
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Outlook Calendar?')) return;

    setIsDisconnecting(true);
    try {
      await fetch('/api/integrations/outlook-calendar/disconnect', { method: 'POST' });
      toast({ title: 'Success', description: 'Outlook Calendar disconnected' });
      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to disconnect',
        variant: 'destructive'
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <CalendarDays className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Outlook Calendar
                {isConnected ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Sync jobs and appointments to Outlook Calendar
              </CardDescription>
            </div>
          </div>

          {isConnected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              <Unlink className="h-4 w-4 mr-2" />
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting}>
              <LinkIcon className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>
      </CardHeader>

      {isConnected && integration && (
        <CardContent>
          <div className="space-y-4">
            {integration.last_error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{integration.last_error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Account</p>
                <p className="font-medium">{integration.external_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Synced</p>
                <p className="font-medium">
                  {integration.last_sync_at
                    ? formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true })
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
