import { createClient } from '@/lib/supabase/server';
import { createHmac, randomBytes } from 'crypto';
import type { Webhook, WebhookDelivery, WebhookEventType } from '@/types/integrations';

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // Seconds: 1m, 5m, 15m, 1h, 2h

export interface CreateWebhookInput {
  name: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  is_active?: boolean;
}

export class WebhookService {
  // ========== CRUD OPERATIONS ==========

  static async list(organizationId: string): Promise<Webhook[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhooks')
      .select('id, organization_id, name, url, events, secret, headers, is_active, last_triggered_at, failure_count, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async get(webhookId: string): Promise<Webhook | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhooks')
      .select('id, organization_id, name, url, events, secret, headers, is_active, last_triggered_at, failure_count, created_at, updated_at')
      .eq('id', webhookId)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(
    organizationId: string,
    input: CreateWebhookInput
  ): Promise<Webhook> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        organization_id: organizationId,
        name: input.name,
        url: input.url,
        events: input.events,
        secret: input.secret,
        headers: input.headers || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(
    webhookId: string,
    input: UpdateWebhookInput
  ): Promise<Webhook> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.url !== undefined) updateData.url = input.url;
    if (input.events !== undefined) updateData.events = input.events;
    if (input.secret !== undefined) updateData.secret = input.secret;
    if (input.headers !== undefined) updateData.headers = input.headers;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', webhookId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(webhookId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) throw error;
  }

  // ========== EVENT TRIGGERING ==========

  static async trigger(
    organizationId: string,
    eventType: WebhookEventType,
    payload: Record<string, unknown>
  ): Promise<void> {
    const supabase = await createClient();

    // Get all active webhooks subscribed to this event
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('id, organization_id, name, url, events, secret, headers, is_active, failure_count')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (!webhooks?.length) return;

    // Deliver to all webhooks in parallel for better performance
    await Promise.all(
      webhooks.map(webhook =>
        this.deliver(webhook as Webhook, eventType, payload).catch(err => {
          // Log error but don't fail other deliveries
          console.error(`Webhook delivery failed for ${webhook.id}:`, err);
        })
      )
    );
  }

  static async deliver(
    webhook: Webhook,
    eventType: WebhookEventType,
    payload: Record<string, unknown>
  ): Promise<WebhookDelivery> {
    const supabase = await createClient();

    // Create delivery record
    const { data: delivery, error: insertError } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        organization_id: webhook.organization_id,
        event_type: eventType,
        payload,
        status: 'pending',
        attempt_count: 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Attempt delivery
    return this.attemptDelivery(delivery as WebhookDelivery, webhook);
  }

  private static async attemptDelivery(
    delivery: WebhookDelivery,
    webhook: Webhook
  ): Promise<WebhookDelivery> {
    const supabase = await createClient();

    const fullPayload = {
      event: delivery.event_type,
      timestamp: new Date().toISOString(),
      data: delivery.payload,
    };

    const body = JSON.stringify(fullPayload);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': delivery.event_type,
      'X-Webhook-Delivery': delivery.id,
      ...webhook.headers,
    };

    // Add signature if secret is set
    if (webhook.secret) {
      const signature = createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseBody = await response.text().catch(() => '');
      const success = response.ok;

      // Update delivery record
      const { data: updated } = await supabase
        .from('webhook_deliveries')
        .update({
          status: success ? 'success' : 'failed',
          status_code: response.status,
          response_body: responseBody.substring(0, 10000), // Limit response size
          attempt_count: delivery.attempt_count + 1,
          delivered_at: success ? new Date().toISOString() : null,
          next_retry_at: success ? null : this.calculateNextRetry(delivery.attempt_count + 1),
        })
        .eq('id', delivery.id)
        .select()
        .single();

      // Update webhook stats
      if (success) {
        await supabase
          .from('webhooks')
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq('id', webhook.id);
      } else {
        await supabase
          .from('webhooks')
          .update({
            failure_count: webhook.failure_count + 1,
          })
          .eq('id', webhook.id);
      }

      return updated as WebhookDelivery;
    } catch (error) {
      // Network or timeout error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const { data: updated } = await supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          error_message: errorMessage,
          attempt_count: delivery.attempt_count + 1,
          next_retry_at: this.calculateNextRetry(delivery.attempt_count + 1),
        })
        .eq('id', delivery.id)
        .select()
        .single();

      await supabase
        .from('webhooks')
        .update({
          failure_count: webhook.failure_count + 1,
        })
        .eq('id', webhook.id);

      return updated as WebhookDelivery;
    }
  }

  private static calculateNextRetry(attemptCount: number): string | null {
    if (attemptCount >= MAX_RETRY_ATTEMPTS) return null;

    const delaySeconds = RETRY_DELAYS[attemptCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    return new Date(Date.now() + delaySeconds * 1000).toISOString();
  }

  // ========== DELIVERY HISTORY ==========

  static async getDeliveries(
    webhookId: string,
    limit: number = 50
  ): Promise<WebhookDelivery[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('id, webhook_id, organization_id, event_type, payload, status, status_code, response_body, error_message, attempt_count, delivered_at, next_retry_at, created_at')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const supabase = await createClient();

    // Get delivery and webhook
    const { data: delivery } = await supabase
      .from('webhook_deliveries')
      .select('id, webhook_id, organization_id, event_type, payload, status, status_code, response_body, error_message, attempt_count, delivered_at, next_retry_at, created_at')
      .eq('id', deliveryId)
      .single();

    if (!delivery) throw new Error('Delivery not found');

    const { data: webhook } = await supabase
      .from('webhooks')
      .select('id, organization_id, name, url, events, secret, headers, is_active, failure_count')
      .eq('id', delivery.webhook_id)
      .single();

    if (!webhook) throw new Error('Webhook not found');

    return this.attemptDelivery(delivery as WebhookDelivery, webhook as Webhook);
  }

  // ========== HELPER METHODS ==========

  static getAvailableEvents(): Array<{ value: WebhookEventType; label: string }> {
    return [
      { value: 'customer.created', label: 'Customer Created' },
      { value: 'customer.updated', label: 'Customer Updated' },
      { value: 'job.created', label: 'Job Created' },
      { value: 'job.updated', label: 'Job Updated' },
      { value: 'job.completed', label: 'Job Completed' },
      { value: 'invoice.created', label: 'Invoice Created' },
      { value: 'invoice.paid', label: 'Invoice Paid' },
      { value: 'proposal.created', label: 'Proposal Created' },
      { value: 'proposal.signed', label: 'Proposal Signed' },
      { value: 'estimate.approved', label: 'Estimate Approved' },
    ];
  }

  static generateSecret(): string {
    return `whsec_${randomBytes(24).toString('base64url')}`;
  }
}
