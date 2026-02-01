import { createClient } from '@/lib/supabase/server';
import type { HubSpotConnectionStatus } from '@/types/integrations';

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const HUBSPOT_API_URL = 'https://api.hubapi.com';

export class HubSpotService {
  // ========== OAUTH ==========

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.HUBSPOT_CLIENT_ID || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`,
      scope: 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write crm.lists.read crm.lists.write',
      state,
    });

    return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(HUBSPOT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.HUBSPOT_CLIENT_ID || '',
        client_secret: process.env.HUBSPOT_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  static async refreshTokens(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(HUBSPOT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.HUBSPOT_CLIENT_ID || '',
        client_secret: process.env.HUBSPOT_CLIENT_SECRET || '',
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  // ========== TOKEN MANAGEMENT ==========

  static async storeTokens(
    organizationId: string,
    tokens: { access_token: string; refresh_token: string; expires_in: number },
    portalId: string
  ): Promise<void> {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: organizationId,
        integration_type: 'hubspot',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        external_id: portalId,
        is_active: true,
        settings: {
          auto_sync_contacts: false,
          sync_companies: false,
          sync_deals: false,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,integration_type',
      });
  }

  static async getValidTokens(organizationId: string): Promise<{
    access_token: string;
    portal_id: string;
  } | null> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('id, access_token, refresh_token, token_expires_at, external_id')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'hubspot')
      .eq('is_active', true)
      .single();

    if (!integration) return null;

    // Check if token needs refresh (5 min buffer)
    const expiresAt = new Date(integration.token_expires_at);
    const needsRefresh = expiresAt < new Date(Date.now() + 5 * 60 * 1000);

    if (needsRefresh) {
      try {
        const newTokens = await this.refreshTokens(integration.refresh_token);
        await this.storeTokens(organizationId, newTokens, integration.external_id);
        return {
          access_token: newTokens.access_token,
          portal_id: integration.external_id,
        };
      } catch {
        // Mark as disconnected
        await this.disconnect(organizationId);
        return null;
      }
    }

    return {
      access_token: integration.access_token,
      portal_id: integration.external_id,
    };
  }

  static async getConnectionStatus(organizationId: string): Promise<HubSpotConnectionStatus> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('id, external_id, is_active, last_sync_at')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'hubspot')
      .single();

    if (!integration || !integration.is_active) {
      return { is_connected: false };
    }

    // Try to get account info
    try {
      const tokens = await this.getValidTokens(organizationId);
      if (tokens) {
        const accountInfo = await this.getAccountInfo(organizationId);
        return {
          is_connected: true,
          portal_id: integration.external_id || undefined,
          hub_domain: accountInfo?.portalId?.toString(),
          last_sync_at: integration.last_sync_at || undefined,
        };
      }
    } catch {
      // Token invalid
    }

    return { is_connected: false };
  }

  static async disconnect(organizationId: string): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('organization_integrations')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'hubspot');
  }

  // ========== API REQUESTS ==========

  static async makeRequest(
    organizationId: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const tokens = await this.getValidTokens(organizationId);
    if (!tokens) throw new Error('HubSpot not connected');

    const url = `${HUBSPOT_API_URL}${endpoint}`;

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
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {};
    }

    return response.json();
  }

  // ========== ACCOUNT INFO ==========

  static async getAccountInfo(organizationId: string): Promise<{ portalId: number } | null> {
    try {
      const result = await this.makeRequest(organizationId, '/account-info/v3/details');
      return result as { portalId: number };
    } catch {
      return null;
    }
  }

  // ========== CONTACT SYNC ==========

  static async syncContact(organizationId: string, customerId: string): Promise<string> {
    const supabase = await createClient();
    const startedAt = Date.now();

    // Fetch customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, email, phone, address_line1, city, state, zip, hubspot_id')
      .eq('id', customerId)
      .single();

    if (!customer) throw new Error('Customer not found');
    if (!customer.email) throw new Error('Customer has no email address');

    const properties: Record<string, string> = {
      email: customer.email,
      firstname: customer.first_name || '',
      lastname: customer.last_name || '',
      phone: customer.phone || '',
      company: customer.company_name || '',
      address: customer.address_line1 || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
    };

    let hubspotId: string;

    if (customer.hubspot_id) {
      // Update existing contact
      await this.makeRequest(
        organizationId,
        `/crm/v3/objects/contacts/${customer.hubspot_id}`,
        'PATCH',
        { properties }
      );
      hubspotId = customer.hubspot_id;
    } else {
      // Search for existing contact by email
      const searchResult = await this.makeRequest(
        organizationId,
        '/crm/v3/objects/contacts/search',
        'POST',
        {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: customer.email,
            }],
          }],
        }
      );

      const results = searchResult.results as Array<{ id: string }>;

      if (results?.length > 0) {
        // Update existing
        hubspotId = results[0].id;
        await this.makeRequest(
          organizationId,
          `/crm/v3/objects/contacts/${hubspotId}`,
          'PATCH',
          { properties }
        );
      } else {
        // Create new contact
        const createResult = await this.makeRequest(
          organizationId,
          '/crm/v3/objects/contacts',
          'POST',
          { properties }
        );
        hubspotId = (createResult as { id: string }).id;
      }
    }

    // Update local record
    await supabase
      .from('customers')
      .update({
        hubspot_id: hubspotId,
        hubspot_synced_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    // Log sync
    await this.logSync(organizationId, 'contact', customerId, 'success', hubspotId, null, startedAt);

    return hubspotId;
  }

  static async syncAllContacts(
    organizationId: string
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
        await this.syncContact(organizationId, customer.id);
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
      .eq('integration_type', 'hubspot');

    return {
      processed: customers.length,
      succeeded,
      failed,
    };
  }

  // ========== LISTS ==========

  static async getLists(organizationId: string): Promise<Array<{ id: string; name: string }>> {
    const result = await this.makeRequest(organizationId, '/crm/v3/lists?count=100');
    const lists = result.lists as Array<{ listId: string; name: string }>;

    return lists.map((list: { listId: string; name: string }) => ({
      id: list.listId,
      name: list.name,
    }));
  }

  static async addContactToList(
    organizationId: string,
    listId: string,
    contactId: string
  ): Promise<void> {
    await this.makeRequest(
      organizationId,
      `/crm/v3/lists/${listId}/memberships/add`,
      'PUT',
      { recordIdsToAdd: [contactId] }
    );
  }

  static async removeContactFromList(
    organizationId: string,
    listId: string,
    contactId: string
  ): Promise<void> {
    await this.makeRequest(
      organizationId,
      `/crm/v3/lists/${listId}/memberships/remove`,
      'PUT',
      { recordIdsToRemove: [contactId] }
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
      integration_type: 'hubspot',
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
