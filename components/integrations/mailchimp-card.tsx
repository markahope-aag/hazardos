'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  AlertCircle,
  Mail
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { OrganizationIntegration } from '@/types/integrations';

interface MailchimpCardProps {
  integration: OrganizationIntegration | null;
}

export function MailchimpCard({ integration }: MailchimpCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isConnected = integration?.is_active;
  const settings = integration?.settings as { account_name?: string; default_list_id?: string } | null;

  // Handle success/error from callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'mailchimp') {
      toast({ title: 'Success', description: 'Mailchimp connected successfully!' });
      router.replace('/settings/integrations');
    } else if (error && searchParams.get('integration') === 'mailchimp') {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect Mailchimp: ${error}`,
        variant: 'destructive'
      });
      router.replace('/settings/integrations');
    }
  }, [searchParams, toast, router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/integrations/mailchimp/connect');
      const { url, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      window.location.href = url;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate connection',
        variant: 'destructive'
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Mailchimp?')) return;

    setIsDisconnecting(true);
    try {
      await fetch('/api/integrations/mailchimp/disconnect', { method: 'POST' });
      toast({ title: 'Success', description: 'Mailchimp disconnected' });
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

  const handleSyncAll = async () => {
    if (!settings?.default_list_id) {
      toast({
        title: 'Configuration Required',
        description: 'Please select a default audience list first',
        variant: 'destructive'
      });
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/integrations/mailchimp/sync/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: settings.default_list_id })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Sync Complete',
          description: `Synced ${result.succeeded} contacts (${result.failed} failed)`
        });
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Mail className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Mailchimp
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
                Sync contacts and manage email marketing
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
                <p className="font-medium">{settings?.account_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data Center</p>
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync All Contacts'}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
