import { WebhookService } from '@/lib/services/webhook-service';
import { WebhookList } from '@/components/settings/webhook-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { requireTenantAdmin } from '@/lib/auth/require-roles';

export default async function WebhooksPage() {
  const { profile } = await requireTenantAdmin();
  const webhooks = await WebhookService.list(profile.organization_id);
  const availableEvents = WebhookService.getAvailableEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
