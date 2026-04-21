import { WebhookForm } from '@/components/settings/webhook-form';
import { WebhookService } from '@/lib/services/webhook-service';

export default function NewWebhookPage() {
  const availableEvents = WebhookService.getAvailableEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Webhook</h1>
        <p className="text-muted-foreground">
          Configure a new webhook endpoint
        </p>
      </div>

      <WebhookForm availableEvents={availableEvents} />
    </div>
  );
}
