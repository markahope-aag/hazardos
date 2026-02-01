import { createClient } from '@/lib/supabase/server';
import { WebhookService } from '@/lib/services/webhook-service';
import { WebhookList } from '@/components/settings/webhook-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function WebhooksPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id)
    .single();

  if (!profile?.organization_id) {
    return <div>No organization found</div>;
  }

  const webhooks = await WebhookService.list(profile.organization_id);
  const availableEvents = WebhookService.getAvailableEvents();

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Send real-time notifications to external services when events occur
          </p>
        </div>
        <Link href="/settings/webhooks/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Webhook
          </Button>
        </Link>
      </div>

      <WebhookList webhooks={webhooks} availableEvents={availableEvents} />
    </div>
  );
}
