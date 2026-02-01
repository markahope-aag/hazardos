'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Webhook, Trash2, Edit, Pause, Play, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Webhook as WebhookType, WebhookEventType } from '@/types/integrations';

interface WebhookListProps {
  webhooks: WebhookType[];
  availableEvents: Array<{ value: WebhookEventType; label: string }>;
}

export function WebhookList({ webhooks, availableEvents }: WebhookListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const getEventLabel = (event: string): string => {
    const found = availableEvents.find(e => e.value === event);
    return found?.label || event;
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    setIsDeleting(webhookId);
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Webhook deleted' });
        router.refresh();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggle = async (webhook: WebhookType) => {
    setIsToggling(webhook.id);
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !webhook.is_active }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: webhook.is_active ? 'Webhook paused' : 'Webhook activated',
        });
        router.refresh();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(null);
    }
  };

  if (webhooks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create a webhook to send events to external services
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configured Webhooks</CardTitle>
        <CardDescription>
          {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Triggered</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((webhook) => (
              <TableRow key={webhook.id}>
                <TableCell>
                  <p className="font-medium">{webhook.name}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {webhook.url}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.slice(0, 2).map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {getEventLabel(event)}
                      </Badge>
                    ))}
                    {webhook.events.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{webhook.events.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                    {webhook.is_active ? 'Active' : 'Paused'}
                  </Badge>
                  {webhook.failure_count > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {webhook.failure_count} failures
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {webhook.last_triggered_at
                    ? formatDistanceToNow(new Date(webhook.last_triggered_at), { addSuffix: true })
                    : 'Never'
                  }
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/settings/webhooks/${webhook.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/settings/webhooks/${webhook.id}/deliveries`)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Deliveries
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggle(webhook)}
                        disabled={isToggling === webhook.id}
                      >
                        {webhook.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(webhook.id)}
                        disabled={isDeleting === webhook.id}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
