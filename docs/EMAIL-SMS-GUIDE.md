# HazardOS Email & SMS Audit and Implementation Guide

## Part 1: Email Configuration Audit

### Current State: Implemented (Outbound Only)

**Provider:** Resend

**Environment Variables:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=notifications@hazardos.com  # or similar
```

### What's Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Transactional sending | Done | Via Resend API |
| Bulk email | Done | `sendBulkEmail()` function |
| HTML templates | Done | Inline HTML generation |
| Debug mode | Done | Console logging in dev |
| Error handling | Done | Returns success/error objects |

### Email Service Location

**File:** `lib/services/email-service.ts`

```typescript
// Core functions available:
sendEmail({ to, subject, html, from?, replyTo? })
sendBulkEmail({ recipients, subject, html, from? })
```

### Email Use Cases Currently Supported

| Trigger | Template | Recipient |
|---------|----------|-----------|
| Password reset | Reset link | User |
| Email verification | Verification link | New user |
| Proposal sent | Proposal PDF link | Customer |
| Proposal signed | Confirmation | Customer + internal |
| Invoice created | Invoice PDF link | Customer |
| Payment received | Receipt | Customer |
| Job scheduled | Appointment details | Customer |
| Welcome email | Onboarding info | New user |

### What's NOT Implemented

| Feature | Status | Effort to Add |
|---------|--------|---------------|
| Inbound email | Not built | 3-4 days |
| Email tracking (opens/clicks) | Not built | 1 day |
| Email templates in database | Not built | 2 days |
| Scheduled/delayed sending | Not built | 1 day |
| Email preferences UI | Not built | 1 day |

### Recommended Improvements

#### 1. Add Email Templates Table

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),

  name VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,

  -- Template variables (for UI hints)
  variables JSONB DEFAULT '[]', -- ["customer_name", "job_date", "amount"]

  -- Type
  template_type VARCHAR(50) NOT NULL, -- proposal, invoice, reminder, etc.
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Add Email Tracking

Resend supports webhooks for:
- `email.delivered`
- `email.opened`
- `email.clicked`
- `email.bounced`
- `email.complained`

```typescript
// Webhook handler
app.post('/api/webhooks/resend', async (req) => {
  const event = req.body;

  await supabase.from('email_events').insert({
    message_id: event.data.email_id,
    event_type: event.type,
    metadata: event.data,
  });
});
```

#### 3. Add Inbound Email (Optional)

For handling customer replies:
- Use Resend inbound webhooks OR
- Use a dedicated inbound service (Postmark, Mailgun)
- Parse and attach to customer record or create activity

---

## Part 2: SMS Implementation (NEW)

### Recommended Provider: Twilio

**Why Twilio:**
- Industry standard, proven reliability
- Excellent Next.js/Node.js SDK
- Delivery status callbacks
- Two-way messaging support
- TCPA compliance tools
- Reasonable pricing (~$0.0079/SMS)

### Cost Estimate

| Item | Cost |
|------|------|
| Phone number | $1.15/month |
| Outbound SMS | $0.0079 each |
| Inbound SMS | $0.0079 each |
| **Typical org (500 SMS/mo)** | **~$5-10/month** |

---

## SMS Implementation Instructions

### Step 1: Database Migration

**File:** `supabase/migrations/20260301000005_sms.sql`

```sql
-- ============================================
-- SMS INFRASTRUCTURE
-- ============================================

-- SMS message types
CREATE TYPE sms_status AS ENUM (
  'queued', 'sending', 'sent', 'delivered', 'failed', 'undelivered'
);

CREATE TYPE sms_message_type AS ENUM (
  'appointment_reminder',
  'job_status',
  'lead_notification',
  'payment_reminder',
  'estimate_follow_up',
  'general'
);

-- Organization SMS settings
CREATE TABLE organization_sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Twilio credentials (can use own or platform shared)
  twilio_account_sid TEXT,
  twilio_auth_token TEXT, -- Should be encrypted in production
  twilio_phone_number TEXT,
  use_platform_twilio BOOLEAN DEFAULT true, -- Use HazardOS shared number

  -- Feature toggles
  sms_enabled BOOLEAN DEFAULT false,
  appointment_reminders_enabled BOOLEAN DEFAULT true,
  appointment_reminder_hours INTEGER DEFAULT 24, -- Hours before job
  job_status_updates_enabled BOOLEAN DEFAULT true,
  lead_notifications_enabled BOOLEAN DEFAULT true,
  payment_reminders_enabled BOOLEAN DEFAULT false,

  -- Quiet hours (TCPA compliance)
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00', -- 9 PM
  quiet_hours_end TIME DEFAULT '08:00', -- 8 AM
  timezone VARCHAR(50) DEFAULT 'America/Chicago',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Customer SMS preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;

-- SMS message log
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Recipient
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  to_phone VARCHAR(20) NOT NULL,

  -- Message
  message_type sms_message_type NOT NULL,
  body TEXT NOT NULL,

  -- Related entity
  related_entity_type VARCHAR(50), -- job, estimate, invoice
  related_entity_id UUID,

  -- Twilio tracking
  twilio_message_sid VARCHAR(50),
  status sms_status DEFAULT 'queued',
  error_code VARCHAR(20),
  error_message TEXT,

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Cost tracking
  segments INTEGER DEFAULT 1,
  cost DECIMAL(10,4)
);

-- SMS templates
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  message_type sms_message_type NOT NULL,
  body TEXT NOT NULL, -- Max 160 chars recommended, supports {{variables}}

  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_sms_messages_org ON sms_messages(organization_id);
CREATE INDEX idx_sms_messages_customer ON sms_messages(customer_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_type ON sms_messages(message_type);
CREATE INDEX idx_sms_templates_org ON sms_templates(organization_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE organization_sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org access" ON organization_sms_settings FOR ALL
  USING (organization_id = get_user_organization_id());
CREATE POLICY "Org access" ON sms_messages FOR ALL
  USING (organization_id = get_user_organization_id());
CREATE POLICY "Org access" ON sms_templates FOR ALL
  USING (organization_id = get_user_organization_id() OR organization_id IS NULL);

-- ============================================
-- DEFAULT TEMPLATES
-- ============================================
INSERT INTO sms_templates (organization_id, name, message_type, body, is_system) VALUES
(NULL, 'Appointment Reminder', 'appointment_reminder',
 'Hi {{customer_name}}! Reminder: {{company_name}} is scheduled for {{job_date}} at {{job_time}}. Reply STOP to opt out.', true),
(NULL, 'Job En Route', 'job_status',
 '{{company_name}}: Our crew is on the way! Expected arrival: {{eta}}. Questions? Call {{company_phone}}', true),
(NULL, 'Job Complete', 'job_status',
 '{{company_name}}: Your job is complete! Thank you for your business. Invoice will be sent shortly.', true),
(NULL, 'New Lead Response', 'lead_notification',
 'Hi {{customer_name}}! Thanks for contacting {{company_name}}. We''ll reach out within {{response_time}} to discuss your project.', true),
(NULL, 'Estimate Follow-up', 'estimate_follow_up',
 'Hi {{customer_name}}! Just following up on your estimate from {{company_name}}. Any questions? Reply or call {{company_phone}}', true),
(NULL, 'Payment Reminder', 'payment_reminder',
 '{{company_name}}: Friendly reminder - Invoice #{{invoice_number}} for ${{amount}} is due {{due_date}}. Pay online: {{payment_link}}', true);
```

### Step 2: TypeScript Types

**File:** `types/sms.ts`

```typescript
export type SmsStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'undelivered';

export type SmsMessageType =
  | 'appointment_reminder'
  | 'job_status'
  | 'lead_notification'
  | 'payment_reminder'
  | 'estimate_follow_up'
  | 'general';

export interface OrganizationSmsSettings {
  id: string;
  organization_id: string;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_phone_number: string | null;
  use_platform_twilio: boolean;
  sms_enabled: boolean;
  appointment_reminders_enabled: boolean;
  appointment_reminder_hours: number;
  job_status_updates_enabled: boolean;
  lead_notifications_enabled: boolean;
  payment_reminders_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export interface SmsMessage {
  id: string;
  organization_id: string;
  customer_id: string | null;
  to_phone: string;
  message_type: SmsMessageType;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  twilio_message_sid: string | null;
  status: SmsStatus;
  error_code: string | null;
  error_message: string | null;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  segments: number;
  cost: number | null;
}

export interface SmsTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  message_type: SmsMessageType;
  body: string;
  is_active: boolean;
  is_system: boolean;
}

export interface SendSmsInput {
  to: string;
  body: string;
  message_type: SmsMessageType;
  customer_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface SendTemplatedSmsInput {
  to: string;
  template_type: SmsMessageType;
  variables: Record<string, string>;
  customer_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}
```

### Step 3: SMS Service

**File:** `lib/services/sms-service.ts`

```typescript
import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';
import type {
  SmsMessage,
  SmsTemplate,
  SendSmsInput,
  SendTemplatedSmsInput,
  OrganizationSmsSettings
} from '@/types/sms';

// Platform-level Twilio client (fallback)
const platformTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const PLATFORM_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

class SmsService {
  private supabase = createClient();

  // ========== SETTINGS ==========

  async getSettings(organizationId: string): Promise<OrganizationSmsSettings | null> {
    const { data, error } = await this.supabase
      .from('organization_sms_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSmsSettings>
  ): Promise<OrganizationSmsSettings> {
    const { data, error } = await this.supabase
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

  async send(organizationId: string, input: SendSmsInput): Promise<SmsMessage> {
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
      const { data: customer } = await this.supabase
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
    const { data: message, error: insertError } = await this.supabase
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
      await this.supabase
        .from('sms_messages')
        .update({
          twilio_message_sid: twilioMessage.sid,
          status: 'sent',
          sent_at: new Date().toISOString(),
          segments: twilioMessage.numSegments,
        })
        .eq('id', message.id);

      return { ...message, twilio_message_sid: twilioMessage.sid, status: 'sent' };

    } catch (error: any) {
      // Update with error
      await this.supabase
        .from('sms_messages')
        .update({
          status: 'failed',
          error_code: error.code,
          error_message: error.message,
          failed_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      throw error;
    }
  }

  async sendTemplated(
    organizationId: string,
    input: SendTemplatedSmsInput
  ): Promise<SmsMessage> {
    // Get template
    const { data: template } = await this.supabase
      .from('sms_templates')
      .select('*')
      .eq('message_type', input.template_type)
      .eq('is_active', true)
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .order('organization_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

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

  async sendAppointmentReminder(jobId: string): Promise<SmsMessage | null> {
    const { data: job } = await this.supabase
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

  async sendJobStatusUpdate(
    jobId: string,
    status: 'en_route' | 'arrived' | 'completed',
    eta?: string
  ): Promise<SmsMessage | null> {
    const { data: job } = await this.supabase
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

  // ========== HELPERS ==========

  private getTwilioClient(settings: OrganizationSmsSettings): {
    client: twilio.Twilio | null;
    fromNumber: string | null;
  } {
    if (settings.use_platform_twilio || !settings.twilio_account_sid) {
      return { client: platformTwilio, fromNumber: PLATFORM_PHONE_NUMBER || null };
    }

    return {
      client: twilio(settings.twilio_account_sid, settings.twilio_auth_token!),
      fromNumber: settings.twilio_phone_number,
    };
  }

  private normalizePhone(phone: string): string | null {
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

  private isQuietHours(settings: OrganizationSmsSettings): boolean {
    const now = new Date();
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

  async getMessages(filters?: {
    customer_id?: string;
    status?: string;
    message_type?: string;
    limit?: number;
  }): Promise<SmsMessage[]> {
    let query = this.supabase
      .from('sms_messages')
      .select('*')
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

  async optIn(customerId: string): Promise<void> {
    await this.supabase
      .from('customers')
      .update({
        sms_opt_in: true,
        sms_opt_in_at: new Date().toISOString(),
        sms_opt_out_at: null,
      })
      .eq('id', customerId);
  }

  async optOut(customerId: string): Promise<void> {
    await this.supabase
      .from('customers')
      .update({
        sms_opt_in: false,
        sms_opt_out_at: new Date().toISOString(),
      })
      .eq('id', customerId);
  }

  // Handle inbound STOP/START
  async handleInboundKeyword(phone: string, keyword: string): Promise<void> {
    const normalizedKeyword = keyword.trim().toUpperCase();

    const { data: customers } = await this.supabase
      .from('customers')
      .select('id')
      .eq('phone', phone);

    if (!customers?.length) return;

    for (const customer of customers) {
      if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(normalizedKeyword)) {
        await this.optOut(customer.id);
      } else if (['START', 'SUBSCRIBE', 'YES'].includes(normalizedKeyword)) {
        await this.optIn(customer.id);
      }
    }
  }
}

export const smsService = new SmsService();
```

### Step 4: API Routes

**File:** `app/api/sms/send/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { smsService } from '@/lib/services/sms-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SecureError('UNAUTHORIZED');

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('FORBIDDEN', 'No organization');
    }

    const body = await request.json();

    if (!body.to || !body.body || !body.message_type) {
      throw new SecureError('VALIDATION_ERROR', 'to, body, and message_type required');
    }

    const message = await smsService.send(profile.organization_id, body);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
```

**File:** `app/api/sms/settings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { smsService } from '@/lib/services/sms-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SecureError('UNAUTHORIZED');

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const settings = await smsService.getSettings(profile?.organization_id);

    return NextResponse.json(settings || { sms_enabled: false });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SecureError('UNAUTHORIZED');

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!['admin', 'owner'].includes(profile?.role || '')) {
      throw new SecureError('FORBIDDEN', 'Admin access required');
    }

    const body = await request.json();
    const settings = await smsService.updateSettings(profile!.organization_id, body);

    return NextResponse.json(settings);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
```

**File:** `app/api/webhooks/twilio/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Parse Twilio webhook (form data)
  const formData = await request.formData();
  const messageSid = formData.get('MessageSid') as string;
  const messageStatus = formData.get('MessageStatus') as string;
  const errorCode = formData.get('ErrorCode') as string | null;
  const errorMessage = formData.get('ErrorMessage') as string | null;

  if (!messageSid) {
    return NextResponse.json({ error: 'Missing MessageSid' }, { status: 400 });
  }

  // Map Twilio status to our status
  const statusMap: Record<string, string> = {
    queued: 'queued',
    sending: 'sending',
    sent: 'sent',
    delivered: 'delivered',
    failed: 'failed',
    undelivered: 'undelivered',
  };

  const status = statusMap[messageStatus] || messageStatus;

  // Update message record
  const updateData: any = { status };

  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  } else if (status === 'failed' || status === 'undelivered') {
    updateData.failed_at = new Date().toISOString();
    updateData.error_code = errorCode;
    updateData.error_message = errorMessage;
  }

  await supabase
    .from('sms_messages')
    .update(updateData)
    .eq('twilio_message_sid', messageSid);

  return NextResponse.json({ success: true });
}
```

**File:** `app/api/webhooks/twilio/inbound/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/lib/services/sms-service';

export async function POST(request: NextRequest) {
  // Parse Twilio webhook
  const formData = await request.formData();
  const from = formData.get('From') as string;
  const body = formData.get('Body') as string;

  if (from && body) {
    // Handle opt-out keywords
    await smsService.handleInboundKeyword(from, body);
  }

  // Return TwiML response (empty = no reply)
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  );
}
```

### Step 5: Cron Job for Reminders

**File:** `app/api/cron/appointment-reminders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { smsService } from '@/lib/services/sms-service';

// This should be called by a cron job (e.g., Vercel Cron) every hour
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  // Get all organizations with SMS enabled
  const { data: orgsWithSms } = await supabase
    .from('organization_sms_settings')
    .select('organization_id, appointment_reminder_hours')
    .eq('sms_enabled', true)
    .eq('appointment_reminders_enabled', true);

  if (!orgsWithSms?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const org of orgsWithSms) {
    // Calculate time window for reminders
    const reminderHours = org.appointment_reminder_hours || 24;
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() + reminderHours);
    const windowEnd = new Date(windowStart);
    windowEnd.setHours(windowEnd.getHours() + 1);

    // Get jobs in reminder window that haven't been reminded
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('organization_id', org.organization_id)
      .eq('status', 'scheduled')
      .gte('scheduled_start', windowStart.toISOString())
      .lt('scheduled_start', windowEnd.toISOString())
      .is('reminder_sent_at', null);

    for (const job of jobs || []) {
      try {
        await smsService.sendAppointmentReminder(job.id);

        // Mark as reminded
        await supabase
          .from('jobs')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', job.id);

        sent++;
      } catch (error) {
        console.error(`Failed to send reminder for job ${job.id}:`, error);
        failed++;
      }
    }
  }

  return NextResponse.json({ sent, failed });
}
```

### Step 6: Environment Variables

```env
# Platform Twilio (shared for all orgs by default)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+16085551234

# Cron secret for scheduled jobs
CRON_SECRET=your-random-secret-here
```

### Step 7: Dependencies

```bash
npm install twilio
```

---

## Summary

### Email Status

| Capability | Status |
|------------|--------|
| Outbound transactional | Working (Resend) |
| Outbound bulk/marketing | Working |
| Email templates (code) | Working |
| Email templates (database) | Not implemented |
| Inbound email parsing | Not implemented |
| Open/click tracking | Not implemented |

### SMS Status (After Implementation)

| Capability | Status |
|------------|--------|
| Outbound SMS | Ready |
| Appointment reminders | Ready |
| Job status updates | Ready |
| Lead notifications | Ready |
| Payment reminders | Ready |
| Template system | Ready |
| Opt-in/opt-out (TCPA) | Ready |
| Quiet hours | Ready |
| Delivery tracking | Ready |
| Inbound handling | Ready |
| Per-org Twilio accounts | Ready |

---

## Implementation Checklist

### Email Improvements (Optional)
- [ ] Add `email_templates` table
- [ ] Add email tracking webhook
- [ ] Add email preferences UI
- [ ] Add inbound email parsing

### SMS Implementation
- [ ] Run database migration
- [ ] Add TypeScript types
- [ ] Create SMS service
- [ ] Add API routes (send, settings, webhooks)
- [ ] Add cron job for reminders
- [ ] Configure Twilio account
- [ ] Add environment variables
- [ ] Add `reminder_sent_at` column to jobs table
- [ ] Create SMS settings UI
- [ ] Add SMS opt-in checkbox to customer forms
- [ ] Test end-to-end

---

**Estimated Total Effort:**
- Email improvements: 2-3 days (optional)
- SMS implementation: 3-4 days

*SMS is high value for reducing no-shows and improving customer communication.*
