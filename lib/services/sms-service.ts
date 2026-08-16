import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertRowsAffected } from '@/lib/utils/db-write';
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler';
import { requiresMarketingConsent } from '@/lib/utils/sms-consent';
import { encryptSecret, decryptSecret } from '@/lib/utils/secret-crypto';
import { queueMessageFailedEvent } from '@/lib/services/message-failed-event';
import type {
  SmsMessage,
  SmsDeliveryLogEntry,
  SmsTemplate,
  SendSmsInput,
  SendTemplatedSmsInput,
  OrganizationSmsSettings,
  SmsSettingsUpdateInput,
  SmsMessageType,
} from '@/types/sms';
import {
  applyBrandPrefix,
  getAuthTokenForSettings,
  isQuietHours,
  normalizePhone,
} from './sms-helpers';
import { getSmsProvider } from './sms-providers';
import { getConversations, getDeliveryLog, getMessages } from './sms-queries';

// Each organization configures its own provider credentials (Twilio or RingCentral)

export class SmsService {
  // ========== SETTINGS ==========

  /**
   * Columns held encrypted at rest. Listed once because getSettings,
   * updateSettings and the decrypt path all have to agree; when it was spelled
   * out per call site the RingCentral columns were easy to add in one place and
   * forget in another.
   */
  private static readonly ENCRYPTED_COLUMNS = [
    'twilio_account_sid',
    'twilio_auth_token',
    'ringcentral_client_id',
    'ringcentral_client_secret',
    'ringcentral_jwt',
  ] as const;

  /** Conditional spread so the shape matches the row: see the note in getSettings. */
  private static decryptSecrets<T extends Record<string, unknown>>(row: T): T {
    const out: Record<string, unknown> = { ...row };
    for (const col of SmsService.ENCRYPTED_COLUMNS) {
      if (row[col] !== undefined) out[col] = decryptSecret(row[col] as string | null);
    }
    return out as T;
  }

  private static encryptSecrets(settings: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const col of SmsService.ENCRYPTED_COLUMNS) {
      if (settings[col] !== undefined) out[col] = encryptSecret(settings[col] as string | null);
    }
    return out;
  }

  static async getSettings(organizationId: string): Promise<OrganizationSmsSettings | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('organization_sms_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throwDbError(error, 'fetch SMS settings');
    if (!data) return null;
    // Conditional spread so the returned shape matches the row exactly. An
    // unconditional assignment would invent null keys for columns the query
    // didn't return.
    return SmsService.decryptSecrets(data);
  }

  static async updateSettings(
    organizationId: string,
    settings: SmsSettingsUpdateInput
  ): Promise<OrganizationSmsSettings> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('organization_sms_settings')
      .upsert({
        organization_id: organizationId,
        ...settings,
        ...SmsService.encryptSecrets(settings as unknown as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throwDbError(error, 'update SMS settings');
    return SmsService.decryptSecrets(data);
  }

  // ========== SENDING ==========

  static async send(organizationId: string, input: SendSmsInput): Promise<SmsMessage> {
    const supabase = await createClient();
    const settings = await this.getSettings(organizationId);

    if (!settings?.sms_enabled) {
      throw new SecureError('BAD_REQUEST', 'SMS is not enabled for this organization');
    }

    // Check quiet hours
    if (settings.quiet_hours_enabled && isQuietHours(settings)) {
      throw new SecureError('BAD_REQUEST', 'Cannot send SMS during quiet hours');
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(input.to);
    if (!normalizedPhone) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid phone number', 'to');
    }

    // Check consent if a customer is provided. TCPA distinguishes marketing
    // from transactional messages: a promotional text needs the customer's
    // express marketing consent, while service messages ride on the implied
    // transactional consent (sms_opt_in). Check whichever the message needs.
    if (input.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('sms_opt_in, sms_marketing_consent')
        .eq('id', input.customer_id)
        .single();

      if (requiresMarketingConsent(input.message_type)) {
        if (!customer?.sms_marketing_consent) {
          throw new SecureError(
            'BAD_REQUEST',
            'Customer has not consented to marketing SMS'
          );
        }
      } else if (!customer?.sms_opt_in) {
        throw new SecureError('BAD_REQUEST', 'Customer has not opted in to SMS');
      }
    }

    return this.deliver(supabase, organizationId, settings, {
      to: normalizedPhone,
      body: input.body,
      message_type: input.message_type,
      customer_id: input.customer_id,
      related_entity_type: input.related_entity_type,
      related_entity_id: input.related_entity_id,
    });
  }

  /**
   * Send a one-off test message to verify Twilio wiring (SMS10). Unlike
   * `send`, this deliberately bypasses the sms_enabled toggle and quiet
   * hours — an admin runs it explicitly, to their own number, to confirm
   * credentials work *before* turning SMS on for real. It still requires
   * configured Twilio credentials (that's the thing under test) and still
   * applies the brand prefix so the admin sees exactly what customers will.
   */
  static async sendTest(organizationId: string, toPhone: string): Promise<SmsMessage> {
    const supabase = await createClient();
    const settings = await this.getSettings(organizationId);

    if (!settings) {
      throw new SecureError('BAD_REQUEST', 'SMS settings are not configured for this organization.');
    }

    const normalizedPhone = normalizePhone(toPhone);
    if (!normalizedPhone) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid phone number', 'to');
    }

    return this.deliver(supabase, organizationId, settings, {
      to: normalizedPhone,
      body: 'This is a test message confirming your SMS setup is working. Reply STOP to opt out.',
      message_type: 'general',
    });
  }

  /**
   * Core dispatch: record the message, hand it to Twilio, and reconcile the
   * record with the result. Callers own the policy gates (opt-in, quiet
   * hours, enabled) before reaching here.
   */
  private static async deliver(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string,
    settings: OrganizationSmsSettings,
    params: {
      to: string;
      body: string;
      message_type: SmsMessageType;
      customer_id?: string;
      related_entity_type?: string;
      related_entity_id?: string;
    }
  ): Promise<SmsMessage> {
    // Which vendor this organization sends through. Checked before the message
    // row is written so a misconfigured tenant fails fast rather than leaving a
    // queued record nothing will ever pick up.
    const provider = getSmsProvider(settings);
    if (!provider.isConfigured()) {
      throw new SecureError('BAD_REQUEST', provider.describeMissingConfig());
    }

    const finalBody = applyBrandPrefix(params.body, settings.sms_brand_prefix);

    // Create message record. Persist the final (prefixed) body so the
    // in-app conversation thread shows exactly what the customer saw.
    const { data: message, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        organization_id: organizationId,
        customer_id: params.customer_id,
        to_phone: params.to,
        message_type: params.message_type,
        body: finalBody,
        related_entity_type: params.related_entity_type,
        related_entity_id: params.related_entity_id,
        status: 'queued',
      })
      .select()
      .single();

    if (insertError) throwDbError(insertError, 'create SMS message');

    try {
      const result = await provider.send({ to: params.to, body: finalBody });

      // 'sent' means the vendor accepted it, not that it reached the handset.
      // Twilio confirms delivery through its status webhook; RingCentral
      // reports Queued on send and settles later in its message store.
      const { data: updated } = await supabase
        .from('sms_messages')
        .update({
          provider: provider.name,
          provider_message_id: result.providerMessageId,
          // Kept in step for Twilio so the existing status webhook, which looks
          // messages up by SID, keeps reconciling deliveries.
          ...(provider.name === 'twilio' && { twilio_message_sid: result.providerMessageId }),
          status: 'sent',
          sent_at: new Date().toISOString(),
          segments: result.segments ?? 1,
        })
        .eq('id', message.id)
        .select()
        .single();

      return (
        updated || {
          ...message,
          provider: provider.name,
          provider_message_id: result.providerMessageId,
          status: 'sent' as const,
        }
      );
    } catch (error: unknown) {
      const providerError = error as { code?: string | number; message?: string };
      await supabase
        .from('sms_messages')
        .update({
          provider: provider.name,
          status: 'failed',
          error_code: providerError.code !== undefined ? String(providerError.code) : 'UNKNOWN',
          error_message: providerError.message || 'Unknown error',
          failed_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      throw error;
    }
  }

  static async sendTemplated(
    organizationId: string,
    input: SendTemplatedSmsInput
  ): Promise<SmsMessage> {
    const supabase = await createClient();

    // Get template - prefer org-specific, fall back to system
    const { data: templates } = await supabase
      .from('sms_templates')
      .select('id, organization_id, name, message_type, body, is_system, is_active, created_at, updated_at')
      .eq('message_type', input.template_type)
      .eq('is_active', true)
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .order('organization_id', { ascending: false, nullsFirst: false });

    const template = templates?.[0];
    if (!template) {
      throw new SecureError('NOT_FOUND', `No active template found for type: ${input.template_type}`);
    }

    // Interpolate variables
    let body = template.body;
    for (const [key, value] of Object.entries(input.variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return this.send(organizationId, {
      to: input.to,
      body,
      message_type: input.template_type,
      customer_id: input.customer_id,
      related_entity_type: input.related_entity_type,
      related_entity_id: input.related_entity_id,
    });
  }

  // ========== APPOINTMENT REMINDERS ==========

  static async sendAppointmentReminder(jobId: string): Promise<SmsMessage | null> {
    const supabase = await createClient();

    const { data: job } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers!customer_id(*),
        organization:organizations(*)
      `)
      .eq('id', jobId)
      .single();

    if (!job) throw new SecureError('NOT_FOUND', 'Job not found');

    const settings = await this.getSettings(job.organization_id);
    if (!settings?.appointment_reminders_enabled) return null;
    if (!settings?.sms_enabled) return null;

    if (!job.customer?.phone || !job.customer?.sms_opt_in) return null;

    const jobDate = new Date(job.scheduled_start_date);
    const jobTime = job.scheduled_start_time || '08:00';
    const variables = {
      customer_name: job.customer.name || 'there',
      company_name: job.organization.name,
      job_date: jobDate.toLocaleDateString(),
      job_time: jobTime,
      company_phone: job.organization.phone || '',
    };

    return this.sendTemplated(job.organization_id, {
      to: job.customer.phone,
      template_type: 'appointment_reminder',
      variables,
      customer_id: job.customer_id,
      related_entity_type: 'job',
      related_entity_id: jobId,
    });
  }

  static async sendJobStatusUpdate(
    jobId: string,
    statusType: 'en_route' | 'arrived' | 'completed',
    eta?: string
  ): Promise<SmsMessage | null> {
    const supabase = await createClient();

    const { data: job } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers!customer_id(*),
        organization:organizations(*)
      `)
      .eq('id', jobId)
      .single();

    if (!job) throw new SecureError('NOT_FOUND', 'Job not found');

    const settings = await this.getSettings(job.organization_id);
    if (!settings?.job_status_updates_enabled) return null;
    if (!settings?.sms_enabled) return null;

    if (!job.customer?.phone || !job.customer?.sms_opt_in) return null;

    const company = job.organization.name as string;
    const companyPhone = (job.organization.phone as string) || '';

    // Different statusTypes need meaningfully different wording — "on the
    // way, ETA X" is wrong once the crew has arrived or the job is done.
    // Template library only has one job_status row today, so we render
    // directly here and send via `send` (not `sendTemplated`). If custom
    // wording becomes a per-org need, this is the spot to move the content
    // back into sms_templates.
    let body: string
    switch (statusType) {
      case 'en_route':
        body = `${company}: Our crew is on the way! ETA ${eta || 'shortly'}. Questions? Call ${companyPhone || 'us'}.`
        break
      case 'arrived':
        body = `${company}: Our crew has arrived at your property and is starting work. Questions? Call ${companyPhone || 'us'}.`
        break
      case 'completed':
        body = `${company}: Your job is complete. Thanks for choosing us — we'll follow up with final paperwork shortly.`
        break
    }

    return this.send(job.organization_id, {
      to: job.customer.phone,
      body,
      message_type: 'job_status',
      customer_id: job.customer_id,
      related_entity_type: 'job',
      related_entity_id: jobId,
    });
  }

  static async sendLeadNotification(
    organizationId: string,
    customerId: string,
    phone: string,
    customerName: string
  ): Promise<SmsMessage | null> {
    const supabase = await createClient();

    const settings = await this.getSettings(organizationId);
    if (!settings?.lead_notifications_enabled) return null;
    if (!settings?.sms_enabled) return null;

    // Check opt-in
    const { data: customer } = await supabase
      .from('customers')
      .select('sms_opt_in')
      .eq('id', customerId)
      .single();

    if (!customer?.sms_opt_in) return null;

    const { data: org } = await supabase
      .from('organizations')
      .select('name, phone')
      .eq('id', organizationId)
      .single();

    const variables = {
      customer_name: customerName || 'there',
      company_name: org?.name || 'Our company',
      response_time: '24 hours',
      company_phone: org?.phone || '',
    };

    return this.sendTemplated(organizationId, {
      to: phone,
      template_type: 'lead_notification',
      variables,
      customer_id: customerId,
      related_entity_type: 'customer',
      related_entity_id: customerId,
    });
  }

  // ========== TEMPLATES ==========

  static async getTemplates(organizationId: string): Promise<SmsTemplate[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sms_templates')
      .select('id, organization_id, name, message_type, body, is_system, is_active, created_at, updated_at')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .order('message_type')
      .order('is_system', { ascending: false });

    if (error) throwDbError(error, 'fetch SMS templates');
    return data || [];
  }

  static async createTemplate(
    organizationId: string,
    input: { name: string; message_type: SmsMessageType; body: string }
  ): Promise<SmsTemplate> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sms_templates')
      .insert({
        organization_id: organizationId,
        name: input.name,
        message_type: input.message_type,
        body: input.body,
        is_system: false,
      })
      .select()
      .single();

    if (error) throwDbError(error, 'create SMS template');
    return data;
  }

  static async updateTemplate(
    templateId: string,
    input: { name?: string; body?: string; is_active?: boolean }
  ): Promise<SmsTemplate> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sms_templates')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('is_system', false)
      .select()
      .single();

    if (error) throwDbError(error, 'update SMS template');
    return data;
  }

  // ========== HELPERS ==========

  /** Get the auth token used for webhook signature validation */
  static getAuthTokenForSettings(settings: OrganizationSmsSettings | null): string | null {
    return getAuthTokenForSettings(settings);
  }

  // ========== MESSAGE HISTORY ==========
  //
  // Implementations live in sms-queries.ts; these stay on the class because the
  // API routes and the inbox call SmsService.* directly.

  static async getMessages(
    organizationId: string,
    filters?: {
      customer_id?: string;
      status?: string;
      message_type?: string;
      limit?: number;
    }
  ): Promise<SmsMessage[]> {
    return getMessages(organizationId, filters);
  }

  static async getDeliveryLog(
    organizationId: string,
    filters?: { status?: string; message_type?: string; limit?: number }
  ): Promise<SmsDeliveryLogEntry[]> {
    return getDeliveryLog(organizationId, filters);
  }

  static async getConversations(
    organizationId: string,
    options: { search?: string; limit?: number } = {},
  ): ReturnType<typeof getConversations> {
    return getConversations(organizationId, options);
  }

  // ========== OPT-IN/OPT-OUT ==========

  static async optIn(customerId: string): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('customers')
      .update({
        sms_opt_in: true,
        sms_opt_in_at: new Date().toISOString(),
        sms_opt_out_at: null,
      })
      .eq('id', customerId);
  }

  static async optOut(customerId: string): Promise<void> {
    const supabase = await createClient();

    // A STOP/opt-out stops everything — transactional AND marketing. START
    // later restores transactional consent; marketing requires fresh express
    // consent, so it stays revoked until the customer explicitly re-opts in.
    await supabase
      .from('customers')
      .update({
        sms_opt_in: false,
        sms_marketing_consent: false,
        sms_opt_out_at: new Date().toISOString(),
      })
      .eq('id', customerId);
  }

  // Handle inbound STOP/START keywords
  static async handleInboundKeyword(phone: string, keyword: string): Promise<void> {
    const supabase = await createClient();
    const normalizedKeyword = keyword.trim().toUpperCase();
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) return;

    // Find customers with this phone number
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', normalizedPhone);

    if (!customers?.length) {
      // Try without the +1 prefix for US numbers
      const phoneWithout1 = normalizedPhone.startsWith('+1')
        ? normalizedPhone.substring(2)
        : normalizedPhone;

      const { data: customersAlt } = await supabase
        .from('customers')
        .select('id')
        .or(`phone.eq.${normalizedPhone},phone.eq.${phoneWithout1},phone.ilike.%${phoneWithout1}`);

      if (!customersAlt?.length) return;

      await Promise.all(customersAlt.map((customer) =>
        this.processKeyword(customer.id, normalizedKeyword)
      ));
      return;
    }

    await Promise.all(customers.map((customer) =>
      this.processKeyword(customer.id, normalizedKeyword)
    ));
  }

  private static async processKeyword(customerId: string, keyword: string): Promise<void> {
    if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(keyword)) {
      await this.optOut(customerId);
    } else if (['START', 'SUBSCRIBE', 'YES', 'UNSTOP'].includes(keyword)) {
      await this.optIn(customerId);
    }
  }

  // ========== WEBHOOK STATUS UPDATE ==========

  static async updateMessageStatus(
    twilioMessageSid: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    // Called only from the Twilio status callback, which has no session. Under
    // the cookie client this update matched zero rows and Twilio was told the
    // callback succeeded, so every message stayed at its send-time status and
    // failed/undelivered SMS looked delivered. Admin client + assert makes a
    // failure loud (Twilio retries) instead of silent.
    const supabase = createAdminClient();

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      queued: 'queued',
      sending: 'sending',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      undelivered: 'undelivered',
    };

    const mappedStatus = statusMap[status] || status;

    const updateData: Record<string, unknown> = { status: mappedStatus };

    if (mappedStatus === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (mappedStatus === 'failed' || mappedStatus === 'undelivered') {
      updateData.failed_at = new Date().toISOString();
      updateData.error_code = errorCode;
      updateData.error_message = errorMessage;
    }

    const rows = assertRowsAffected(
      await supabase
        .from('sms_messages')
        .update(updateData)
        .eq('twilio_message_sid', twilioMessageSid)
        .select('id, organization_id, related_entity_type, related_entity_id'),
      `updateMessageStatus(${twilioMessageSid})`,
    );

    if (mappedStatus === 'failed' || mappedStatus === 'undelivered') {
      const row = rows[0] as {
        organization_id: string;
        related_entity_type: string | null;
        related_entity_id: string | null;
      };
      await queueMessageFailedEvent({
        organizationId: row.organization_id,
        entityType: row.related_entity_type,
        entityId: row.related_entity_id,
        channel: 'sms',
      });
    }
  }
}
