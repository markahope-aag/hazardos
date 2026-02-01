'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Webhook, WebhookEventType } from '@/types/integrations';

interface WebhookFormProps {
  webhook?: Webhook;
  availableEvents: Array<{ value: WebhookEventType; label: string }>;
}

export function WebhookForm({ webhook, availableEvents }: WebhookFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [name, setName] = useState(webhook?.name || '');
  const [url, setUrl] = useState(webhook?.url || '');
  const [secret, setSecret] = useState(webhook?.secret || '');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(
    webhook?.events || []
  );

  const handleEventToggle = (event: WebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'whsec_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecret(result);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!url.trim()) {
      toast({
        title: 'Validation Error',
        description: 'URL is required',
        variant: 'destructive',
      });
      return;
    }

    if (selectedEvents.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Select at least one event',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = webhook ? `/api/webhooks/${webhook.id}` : '/api/webhooks';
      const method = webhook ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url,
          secret: secret || undefined,
          events: selectedEvents,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: webhook ? 'Webhook updated' : 'Webhook created',
        });
        router.push('/settings/webhooks');
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{webhook ? 'Edit Webhook' : 'Create Webhook'}</CardTitle>
          <CardDescription>
            Configure where and when to send event notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Zapier Integration"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Endpoint URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret">Signing Secret (optional)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="secret"
                  type={showSecret ? 'text' : 'password'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="whsec_..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={generateSecret}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Used to sign payloads with HMAC-SHA256. Include in your endpoint to verify requests.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Select which events should trigger this webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {availableEvents.map((event) => (
              <div key={event.value} className="flex items-center space-x-2">
                <Checkbox
                  id={event.value}
                  checked={selectedEvents.includes(event.value)}
                  onCheckedChange={() => handleEventToggle(event.value)}
                />
                <Label htmlFor={event.value} className="cursor-pointer">
                  {event.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : webhook ? 'Update Webhook' : 'Create Webhook'}
        </Button>
      </div>
    </div>
  );
}
