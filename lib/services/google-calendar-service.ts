import { google, calendar_v3 } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import type { GoogleCalendarConnectionStatus } from '@/types/integrations';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
];

export class GoogleCalendarService {
  // ========== OAUTH ==========

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    id_token?: string;
  }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`,
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
    expires_in: number;
  }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
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
        integration_type: 'google_calendar',
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
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'google_calendar')
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

  static async getConnectionStatus(organizationId: string): Promise<GoogleCalendarConnectionStatus> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'google_calendar')
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
      .eq('integration_type', 'google_calendar');
  }

  // ========== CALENDAR API ==========

  private static async getCalendarClient(organizationId: string): Promise<calendar_v3.Calendar> {
    const tokens = await this.getValidTokens(organizationId);
    if (!tokens) throw new Error('Google Calendar not connected');

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  static async getCalendars(organizationId: string): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
    const calendar = await this.getCalendarClient(organizationId);

    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    return calendars.map(cal => ({
      id: cal.id || '',
      summary: cal.summary || 'Unnamed Calendar',
      primary: cal.primary || false,
    }));
  }

  // ========== JOB SYNC ==========

  static async syncJobToCalendar(
    organizationId: string,
    jobId: string,
    calendarId: string = 'primary'
  ): Promise<string> {
    const supabase = await createClient();
    const calendar = await this.getCalendarClient(organizationId);

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
      .select('google_event_id')
      .eq('job_id', jobId)
      .eq('calendar_type', 'google')
      .maybeSingle();

    const eventBody: calendar_v3.Schema$Event = {
      summary: `Job: ${job.job_number} - ${customerName}`,
      description: `HazardOS Job #${job.job_number}\n\nCustomer: ${customerName}\nStatus: ${job.status}\n\nView in HazardOS: ${process.env.NEXT_PUBLIC_APP_URL}/jobs/${jobId}`,
      location,
      start: {
        dateTime: job.scheduled_date ? new Date(job.scheduled_date).toISOString() : undefined,
        date: job.scheduled_date ? undefined : new Date().toISOString().split('T')[0],
      },
      end: {
        dateTime: job.scheduled_date
          ? new Date(new Date(job.scheduled_date).getTime() + 2 * 60 * 60 * 1000).toISOString()
          : undefined,
        date: job.scheduled_date ? undefined : new Date().toISOString().split('T')[0],
      },
    };

    let eventId: string;

    if (existingSync?.google_event_id) {
      // Update existing event
      const response = await calendar.events.update({
        calendarId,
        eventId: existingSync.google_event_id,
        requestBody: eventBody,
      });
      eventId = response.data.id || existingSync.google_event_id;
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventBody,
      });
      eventId = response.data.id || '';
    }

    // Update sync record
    await supabase
      .from('calendar_sync_events')
      .upsert({
        organization_id: organizationId,
        job_id: jobId,
        event_type: 'job',
        google_event_id: eventId,
        calendar_type: 'google',
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
      .eq('integration_type', 'google_calendar');

    return eventId;
  }

  static async deleteCalendarEvent(
    organizationId: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    const supabase = await createClient();
    const calendar = await this.getCalendarClient(organizationId);

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      // Event may already be deleted
      console.error('Failed to delete calendar event:', error);
    }

    // Remove sync record
    await supabase
      .from('calendar_sync_events')
      .delete()
      .eq('google_event_id', eventId);
  }
}
