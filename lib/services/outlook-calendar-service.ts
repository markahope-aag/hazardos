import { Client } from '@microsoft/microsoft-graph-client';
import { createClient } from '@/lib/supabase/server';
import type { OutlookCalendarConnectionStatus } from '@/types/integrations';

const AZURE_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const AZURE_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Calendars.ReadWrite',
  'User.Read',
];

export class OutlookCalendarService {
  // ========== OAUTH ==========

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook-calendar/callback`,
      response_type: 'code',
      scope: SCOPES.join(' '),
      response_mode: 'query',
      state,
    });

    return `${AZURE_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(AZURE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.AZURE_CLIENT_ID || '',
        client_secret: process.env.AZURE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook-calendar/callback`,
        scope: SCOPES.join(' '),
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
    const response = await fetch(AZURE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.AZURE_CLIENT_ID || '',
        client_secret: process.env.AZURE_CLIENT_SECRET || '',
        scope: SCOPES.join(' '),
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
    email: string
  ): Promise<void> {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: organizationId,
        integration_type: 'outlook_calendar',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        external_id: email,
        is_active: true,
        settings: {
          email,
          auto_sync_jobs: true,
          sync_site_surveys: true,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,integration_type',
      });
  }

  static async getValidTokens(organizationId: string): Promise<{
    access_token: string;
    email: string;
  } | null> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('id, access_token, refresh_token, token_expires_at, external_id')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'outlook_calendar')
      .eq('is_active', true)
      .single();

    if (!integration) return null;

    // Check if token needs refresh (5 min buffer)
    const expiresAt = new Date(integration.token_expires_at);
    const needsRefresh = expiresAt < new Date(Date.now() + 5 * 60 * 1000);

    if (needsRefresh) {
      try {
        const newTokens = await this.refreshTokens(integration.refresh_token);
        const expiresAtNew = new Date(Date.now() + newTokens.expires_in * 1000);

        await supabase
          .from('organization_integrations')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            token_expires_at: expiresAtNew.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id);

        return {
          access_token: newTokens.access_token,
          email: integration.external_id,
        };
      } catch {
        await this.disconnect(organizationId);
        return null;
      }
    }

    return {
      access_token: integration.access_token,
      email: integration.external_id,
    };
  }

  static async getConnectionStatus(organizationId: string): Promise<OutlookCalendarConnectionStatus> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('id, external_id, is_active, last_sync_at')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'outlook_calendar')
      .single();

    if (!integration || !integration.is_active) {
      return { is_connected: false };
    }

    return {
      is_connected: true,
      email: integration.external_id || undefined,
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
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'outlook_calendar');
  }

  // ========== GRAPH CLIENT ==========

  private static async getGraphClient(organizationId: string): Promise<Client> {
    const tokens = await this.getValidTokens(organizationId);
    if (!tokens) throw new Error('Outlook Calendar not connected');

    return Client.init({
      authProvider: (done) => {
        done(null, tokens.access_token);
      },
    });
  }

  static async getUserInfo(organizationId: string): Promise<{ email: string; displayName: string } | null> {
    try {
      const client = await this.getGraphClient(organizationId);
      const user = await client.api('/me').select('mail,displayName').get();
      return {
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
      };
    } catch {
      return null;
    }
  }

  static async getCalendars(organizationId: string): Promise<Array<{ id: string; name: string; isDefault: boolean }>> {
    const client = await this.getGraphClient(organizationId);

    const response = await client.api('/me/calendars').get();
    const calendars = response.value || [];

    return calendars.map((cal: { id: string; name: string; isDefaultCalendar: boolean }) => ({
      id: cal.id,
      name: cal.name,
      isDefault: cal.isDefaultCalendar || false,
    }));
  }

  // ========== JOB SYNC ==========

  static async syncJobToCalendar(organizationId: string, jobId: string): Promise<string> {
    const supabase = await createClient();
    const client = await this.getGraphClient(organizationId);

    // Get job details
    const { data: job } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(
          first_name,
          last_name,
          company_name,
          address_line1,
          city,
          state,
          zip
        )
      `)
      .eq('id', jobId)
      .single();

    if (!job) throw new Error('Job not found');

    const customer = job.customer as {
      first_name?: string;
      last_name?: string;
      company_name?: string;
      address_line1?: string;
      city?: string;
      state?: string;
      zip?: string;
    };

    const customerName = customer?.company_name ||
      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
      'Unknown Customer';

    const location = [
      customer?.address_line1,
      customer?.city,
      customer?.state,
      customer?.zip,
    ].filter(Boolean).join(', ');

    // Check for existing sync
    const { data: existingSync } = await supabase
      .from('calendar_sync_events')
      .select('outlook_event_id')
      .eq('job_id', jobId)
      .eq('calendar_type', 'outlook')
      .maybeSingle();

    const startDate = job.scheduled_date ? new Date(job.scheduled_date) : new Date();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const eventBody = {
      subject: `Job: ${job.job_number} - ${customerName}`,
      body: {
        contentType: 'HTML',
        content: `<p><strong>HazardOS Job #${job.job_number}</strong></p>
<p>Customer: ${customerName}<br/>Status: ${job.status}</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${jobId}">View in HazardOS</a></p>`,
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC',
      },
      location: {
        displayName: location,
      },
    };

    let eventId: string;

    if (existingSync?.outlook_event_id) {
      // Update existing event
      const response = await client
        .api(`/me/events/${existingSync.outlook_event_id}`)
        .update(eventBody);
      eventId = response.id || existingSync.outlook_event_id;
    } else {
      // Create new event
      const response = await client.api('/me/events').post(eventBody);
      eventId = response.id;
    }

    // Update sync record
    await supabase
      .from('calendar_sync_events')
      .upsert({
        organization_id: organizationId,
        job_id: jobId,
        event_type: 'job',
        outlook_event_id: eventId,
        calendar_type: 'outlook',
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      }, {
        onConflict: 'job_id,calendar_type',
        ignoreDuplicates: false,
      });

    // Update integration last sync
    await supabase
      .from('organization_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'outlook_calendar');

    return eventId;
  }

  static async deleteCalendarEvent(organizationId: string, eventId: string): Promise<void> {
    const supabase = await createClient();
    const client = await this.getGraphClient(organizationId);

    try {
      await client.api(`/me/events/${eventId}`).delete();
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
    }

    await supabase
      .from('calendar_sync_events')
      .delete()
      .eq('outlook_event_id', eventId);
  }
}
