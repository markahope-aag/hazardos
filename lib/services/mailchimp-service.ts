import { createClient } from '@/lib/supabase/server';
import type { MailchimpConnectionStatus, MailchimpList } from '@/types/integrations';

const MAILCHIMP_AUTH_URL = 'https://login.mailchimp.com/oauth2/authorize';
const MAILCHIMP_TOKEN_URL = 'https://login.mailchimp.com/oauth2/token';
const MAILCHIMP_METADATA_URL = 'https://login.mailchimp.com/oauth2/metadata';

export class MailchimpService {
  // ========== OAUTH ==========

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.MAILCHIMP_CLIENT_ID || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/mailchimp/callback`,
      state,
    });

    return `${MAILCHIMP_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const response = await fetch(MAILCHIMP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.MAILCHIMP_CLIENT_ID || '',
        client_secret: process.env.MAILCHIMP_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/mailchimp/callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  static async getAccountMetadata(accessToken: string): Promise<{
    dc: string;
    accountname: string;
    login_url: string;
    api_endpoint: string;
  }> {
    const response = await fetch(MAILCHIMP_METADATA_URL, {
      headers: {
        'Authorization': `OAuth ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get account metadata');
    }

    return response.json();
  }

  // ========== TOKEN MANAGEMENT ==========

  static async storeTokens(
    organizationId: string,
    tokens: { access_token: string; expires_in: number },
    metadata: { dc: string; accountname: string; api_endpoint: string }
  ): Promise<void> {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: organizationId,
        integration_type: 'mailchimp',
        access_token: tokens.access_token,
        refresh_token: null, // Mailchimp tokens don't expire (no refresh needed)
        token_expires_at: expiresAt.toISOString(),
        external_id: metadata.dc, // Data center
        is_active: true,
        settings: {
          account_name: metadata.accountname,
          api_endpoint: metadata.api_endpoint,
          auto_sync_contacts: false,
          sync_tags: true,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,integration_type',
      });
  }

  static async getValidTokens(organizationId: string): Promise<{
    access_token: string;
    api_endpoint: string;
  } | null> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'mailchimp')
      .eq('is_active', true)
      .single();

    if (!integration) return null;

    const settings = integration.settings as { api_endpoint?: string } | null;

    return {
      access_token: integration.access_token,
      api_endpoint: settings?.api_endpoint || `https://${integration.external_id}.api.mailchimp.com/3.0`,
    };
  }

  static async getConnectionStatus(organizationId: string): Promise<MailchimpConnectionStatus> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'mailchimp')
      .single();

    if (!integration || !integration.is_active) {
      return { is_connected: false };
    }

    const settings = integration.settings as { account_name?: string } | null;

    return {
      is_connected: true,
      account_name: settings?.account_name,
      data_center: integration.external_id || undefined,
      last_sync_at: integration.last_sync_at || undefined,
    };
  }

  static async disconnect(organizationId: string): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('organization_integrations')
      .update({
        is_active: false,
        access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'mailchimp');
  }

  // ========== API REQUESTS ==========

  static async makeRequest(
    organizationId: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const tokens = await this.getValidTokens(organizationId);
    if (!tokens) throw new Error('Mailchimp not connected');

    const url = `${tokens.api_endpoint}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailchimp API error: ${response.status} - ${error}`);
    }

    // DELETE requests may not return content
    if (method === 'DELETE' && response.status === 204) {
      return {};
    }

    return response.json();
  }

  // ========== LISTS / AUDIENCES ==========

  static async getLists(organizationId: string): Promise<MailchimpList[]> {
    const result = await this.makeRequest(organizationId, '/lists?count=100');

    interface MailchimpListResponse {
      id: string;
      name: string;
      stats: { member_count: number };
    }

    const lists = result.lists as MailchimpListResponse[];

    return lists.map((list: MailchimpListResponse) => ({
      id: list.id,
      name: list.name,
      member_count: list.stats.member_count,
    }));
  }

  // ========== CONTACT SYNC ==========

  static async syncContact(
    organizationId: string,
    customerId: string,
    listId: string
  ): Promise<string> {
    const supabase = await createClient();
    const startedAt = Date.now();

    // Fetch customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (!customer) throw new Error('Customer not found');
    if (!customer.email) throw new Error('Customer has no email address');

    // Create subscriber hash (MD5 of lowercase email)
    const { createHash } = await import('crypto');
    const subscriberHash = createHash('md5')
      .update(customer.email.toLowerCase())
      .digest('hex');

    const memberData: Record<string, unknown> = {
      email_address: customer.email,
      status_if_new: 'subscribed',
      merge_fields: {
        FNAME: customer.first_name || '',
        LNAME: customer.last_name || '',
        PHONE: customer.phone || '',
        ADDRESS: {
          addr1: customer.address_line1 || '',
          city: customer.city || '',
          state: customer.state || '',
          zip: customer.zip || '',
          country: 'US',
        },
      },
    };

    if (customer.company_name) {
      (memberData.merge_fields as Record<string, unknown>).COMPANY = customer.company_name;
    }

    // Use PUT for upsert behavior
    const result = await this.makeRequest(
      organizationId,
      `/lists/${listId}/members/${subscriberHash}`,
      'PUT',
      memberData
    );

    const mailchimpId = result.id as string;

    // Update local record
    await supabase
      .from('customers')
      .update({
        mailchimp_id: mailchimpId,
        mailchimp_synced_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    // Log sync
    await this.logSync(organizationId, 'contact', customerId, 'success', mailchimpId, null, startedAt);

    return mailchimpId;
  }

  static async syncAllContacts(
    organizationId: string,
    listId: string
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    const supabase = await createClient();

    // Get all customers with emails
    const { data: customers } = await supabase
      .from('customers')
      .select('id, email')
      .eq('organization_id', organizationId)
      .not('email', 'is', null);

    if (!customers?.length) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const customer of customers) {
      try {
        await this.syncContact(organizationId, customer.id, listId);
        succeeded++;
      } catch (error) {
        console.error(`Failed to sync customer ${customer.id}:`, error);
        failed++;
      }
    }

    // Update last sync time
    await supabase
      .from('organization_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'mailchimp');

    return {
      processed: customers.length,
      succeeded,
      failed,
    };
  }

  // ========== TAGS ==========

  static async addTagToContact(
    organizationId: string,
    listId: string,
    email: string,
    tagName: string
  ): Promise<void> {
    const { createHash } = await import('crypto');
    const subscriberHash = createHash('md5')
      .update(email.toLowerCase())
      .digest('hex');

    await this.makeRequest(
      organizationId,
      `/lists/${listId}/members/${subscriberHash}/tags`,
      'POST',
      {
        tags: [{ name: tagName, status: 'active' }],
      }
    );
  }

  static async removeTagFromContact(
    organizationId: string,
    listId: string,
    email: string,
    tagName: string
  ): Promise<void> {
    const { createHash } = await import('crypto');
    const subscriberHash = createHash('md5')
      .update(email.toLowerCase())
      .digest('hex');

    await this.makeRequest(
      organizationId,
      `/lists/${listId}/members/${subscriberHash}/tags`,
      'POST',
      {
        tags: [{ name: tagName, status: 'inactive' }],
      }
    );
  }

  // ========== SYNC LOGGING ==========

  static async logSync(
    organizationId: string,
    syncType: string,
    entityId: string | null,
    status: 'success' | 'failed',
    externalId: string | null,
    errorMessage: string | null,
    startedAt: number
  ): Promise<void> {
    const supabase = await createClient();
    const completedAt = Date.now();

    await supabase.from('marketing_sync_log').insert({
      organization_id: organizationId,
      integration_type: 'mailchimp',
      sync_type: syncType,
      entity_id: entityId,
      status,
      external_id: externalId,
      error_message: errorMessage,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date(completedAt).toISOString(),
      duration_ms: completedAt - startedAt,
    });
  }
}
