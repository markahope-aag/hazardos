import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';
import type {
  SmsMessage,
  SmsTemplate,
  SendSmsInput,
  SendTemplatedSmsInput,
  OrganizationSmsSettings,
  SmsSettingsUpdateInput,
  SmsMessageType,
} from '@/types/sms';

// Platform-level Twilio client (fallback)
const getPlatformTwilioClient = () => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return null;
};

const PLATFORM_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export class SmsService {
  // ========== SETTINGS ==========

  static async getSettings(organizationId: string): Promise<OrganizationSmsSettings | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('organization_sms_settings')
      .select('id, organization_id, sms_enabled, use_platform_twilio, twilio_account_sid, twilio_auth_token, twilio_phone_number, appointment_reminders_enabled, job_status_updates_enabled, lead_notifications_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone, created_at, updated_at')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
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
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ========== SENDING ==========

  static async send(organizationId: string, input: SendSmsInput): Promise<SmsMessage> {
    const supabase = await createClient();
    const settings = await this.getSettings(organizationId);

    if (!settings?.sms_enabled) {
      throw new Error('SMS is not enabled for this organization');
    }

    // Check quiet hours
    if (settings.quiet_hours_enabled && this.isQuietHours(settings)) {
      throw new Error('Cannot send SMS during quiet hours');
    }

    // Normalize phone number
    const normalizedPhone = this.normalizePhone(input.to);
    if (!normalizedPhone) {
      throw new Error('Invalid phone number');
    }

    // Check opt-in if customer provided
    if (input.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('sms_opt_in')
        .eq('id', input.customer_id)
        .single();

      if (!customer?.sms_opt_in) {
        throw new Error('Customer has not opted in to SMS');
      }
    }

    // Get Twilio client and phone number
    const { client, fromNumber } = this.getTwilioClient(settings);

    if (!client || !fromNumber) {
      throw new Error('SMS service not configured');
    }

    // Create message record
    const { data: message, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        organization_id: organizationId,
        customer_id: input.customer_id,
        to_phone: normalizedPhone,
        message_type: input.message_type,
        body: input.body,
        related_entity_type: input.related_entity_type,
        related_entity_id: input.related_entity_id,
        status: 'queued',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Send via Twilio
    try {
      const twilioMessage = await client.messages.create({
        body: input.body,
        from: fromNumber,
        to: normalizedPhone,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
      });

      // Update with Twilio SID
      const { data: updated } = await supabase
        .from('sms_messages')
        .update({
          twilio_message_sid: twilioMessage.sid,
          status: 'sent',
          sent_at: new Date().toISOString(),
          segments: parseInt(twilioMessage.numSegments || '1', 10),
        })
        .eq('id', message.id)
        .select()
        .single();

      return updated || { ...message, twilio_message_sid: twilioMessage.sid, status: 'sent' as const };
    } catch (error: unknown) {
      const twilioError = error as { code?: string; message?: string };
      // Update with error
      await supabase
        .from('sms_messages')
        .update({
          status: 'failed',
          error_code: twilioError.code || 'UNKNOWN',
          error_message: twilioError.message || 'Unknown error',
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
      throw new Error(`No active template found for type: ${input.template_type}`);
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
        customer:customers(*),
        organization:organizations(*)
      `)
      .eq('id', jobId)
      .single();

    if (!job) throw new Error('Job not found');

    const settings = await this.getSettings(job.organization_id);
    if (!settings?.appointment_reminders_enabled) return null;
    if (!settings?.sms_enabled) return null;

    if (!job.customer?.phone || !job.customer?.sms_opt_in) return null;

    const jobDate = new Date(job.scheduled_start);
    const variables = {
      customer_name: job.customer.first_name || job.customer.company_name || 'there',
      company_name: job.organization.name,
      job_date: jobDate.toLocaleDateString(),
      job_time: jobDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        customer:customers(*),
        organization:organizations(*)
      `)
      .eq('id', jobId)
      .single();

    if (!job) throw new Error('Job not found');

    const settings = await this.getSettings(job.organization_id);
    if (!settings?.job_status_updates_enabled) return null;
    if (!settings?.sms_enabled) return null;

    if (!job.customer?.phone || !job.customer?.sms_opt_in) return null;

    const variables = {
      company_name: job.organization.name,
      eta: eta || 'shortly',
      company_phone: job.organization.phone || '',
    };

    return this.sendTemplated(job.organization_id, {
      to: job.customer.phone,
      template_type: 'job_status',
      variables,
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

    if (error) throw error;
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

    if (error) throw error;
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

    if (error) throw error;
    return data;
  }

  // ========== HELPERS ==========

  private static getTwilioClient(settings: OrganizationSmsSettings): {
    client: ReturnType<typeof twilio> | null;
    fromNumber: string | null;
  } {
    if (settings.use_platform_twilio || !settings.twilio_account_sid) {
      return { client: getPlatformTwilioClient(), fromNumber: PLATFORM_PHONE_NUMBER || null };
    }

    return {
      client: twilio(settings.twilio_account_sid, settings.twilio_auth_token!),
      fromNumber: settings.twilio_phone_number,
    };
  }

  private static normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    // US: 10 digits
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // US with country code: 11 digits starting with 1
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // Already E.164 format
    if (phone.startsWith('+') && digits.length >= 10) {
      return `+${digits}`;
    }

    return null;
  }

  private static isQuietHours(settings: OrganizationSmsSettings): boolean {
    const now = new Date();
    // Convert to org timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: settings.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTime = formatter.format(now);

    const start = settings.quiet_hours_start;
    const end = settings.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 21:00 - 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  // ========== MESSAGE HISTORY ==========

  static async getMessages(
    organizationId: string,
    filters?: {
      customer_id?: string;
      status?: string;
      message_type?: string;
      limit?: number;
    }
  ): Promise<SmsMessage[]> {
    const supabase = await createClient();

    let query = supabase
      .from('sms_messages')
      .select('id, organization_id, customer_id, to_phone, message_type, body, status, twilio_message_sid, segments, error_code, error_message, related_entity_type, related_entity_id, queued_at, sent_at, delivered_at, failed_at, created_at')
      .eq('organization_id', organizationId)
      .order('queued_at', { ascending: false });

    if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.message_type) query = query.eq('message_type', filters.message_type);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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

    await supabase
      .from('customers')
      .update({
        sms_opt_in: false,
        sms_opt_out_at: new Date().toISOString(),
      })
      .eq('id', customerId);
  }

  // Handle inbound STOP/START keywords
  static async handleInboundKeyword(phone: string, keyword: string): Promise<void> {
    const supabase = await createClient();
    const normalizedKeyword = keyword.trim().toUpperCase();
    const normalizedPhone = this.normalizePhone(phone);

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

      for (const customer of customersAlt) {
        await this.processKeyword(customer.id, normalizedKeyword);
      }
      return;
    }

    for (const customer of customers) {
      await this.processKeyword(customer.id, normalizedKeyword);
    }
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
    const supabase = await createClient();

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

    await supabase
      .from('sms_messages')
      .update(updateData)
      .eq('twilio_message_sid', twilioMessageSid);
  }
}
