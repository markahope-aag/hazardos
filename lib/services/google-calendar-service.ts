import { google, calendar_v3 } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import type { GoogleCalendarConnectionStatus } from '@/types/integrations';
import { createServiceLogger, formatError } from '@/lib/utils/logger';
import { SecureError } from '@/lib/utils/secure-error-handler';

const log = createServiceLogger('GoogleCalendarService');

// Builds Google Calendar start/end blocks for a HazardOS job. Rule:
//   - If the job has a scheduled_start_time, make it a timed event with a
//     duration driven by estimated_duration_hours (default 2h).
//   - Otherwise, make it an all-day event spanning scheduled_start_date
//     through scheduled_end_date (Google all-day end.date is exclusive, so
//     we add a day).
function buildGoogleEventTiming(job: {
  scheduled_start_date: string;
  scheduled_start_time: string | null;
  scheduled_end_date: string | null;
  estimated_duration_hours: number | null;
}): Pick<calendar_v3.Schema$Event, 'start' | 'end'> {
  if (job.scheduled_start_time) {
    const start = new Date(`${job.scheduled_start_date}T${job.scheduled_start_time}`);
    const durationHours = job.estimated_duration_hours && job.estimated_duration_hours > 0
      ? job.estimated_duration_hours
      : 2;
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    return {
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    };
  }

  const lastDay = job.scheduled_end_date || job.scheduled_start_date;
  const exclusiveEnd = new Date(lastDay);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  return {
    start: { date: job.scheduled_start_date },
    end: { date: exclusiveEnd.toISOString().slice(0, 10) },
  };
}
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
      throw new SecureError('BAD_REQUEST', `Token exchange failed: ${error}`);
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
      throw new SecureError('BAD_REQUEST', 'Token refresh failed');
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
      .select('id, access_token, refresh_token, token_expires_at, external_id')
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
      .select('id, external_id, is_active, last_sync_at')
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
    if (!tokens) throw new SecureError('BAD_REQUEST', 'Google Calendar not connected');

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

  // ========== READ: external events ==========

  // Fetches the org's primary-calendar events in a date range, minus the
  // events we pushed from HazardOS ourselves (looked up by google_event_id in
  // calendar_sync_events). The caller gets only "external" entries — the
  // user's meetings, appointments, personal items — so the HazardOS calendar
  // can render them alongside jobs without double-booking the view.
  //
  // Returns null when Google Calendar isn't connected (caller treats as empty).
  static async listEventsInRange(
    organizationId: string,
    start: string,
    end: string,
    calendarId: string = 'primary',
  ): Promise<Array<{
    id: string
    summary: string
    start: string | null
    end: string | null
    all_day: boolean
    location: string | null
    html_link: string | null
  }> | null> {
    const tokens = await this.getValidTokens(organizationId)
    if (!tokens) return null

    const calendar = await this.getCalendarClient(organizationId)

    // timeMin/timeMax expect RFC3339. Expanding to full-day bounds so events
    // on the first and last day of the range show up regardless of timezone.
    const timeMin = new Date(`${start}T00:00:00Z`).toISOString()
    const timeMax = new Date(`${end}T23:59:59Z`).toISOString()

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    })

    const items = response.data.items || []

    const supabase = await createClient()
    const { data: syncRows } = await supabase
      .from('calendar_sync_events')
      .select('google_event_id')
      .eq('organization_id', organizationId)
      .eq('calendar_type', 'google')
      .not('google_event_id', 'is', null)

    const ownedEventIds = new Set(
      (syncRows || [])
        .map((r) => r.google_event_id as string | null)
        .filter((id): id is string => !!id),
    )

    return items
      .filter((e) => e.id && !ownedEventIds.has(e.id))
      .map((e) => ({
        id: e.id!,
        summary: e.summary || '(no title)',
        start: e.start?.dateTime || e.start?.date || null,
        end: e.end?.dateTime || e.end?.date || null,
        all_day: !e.start?.dateTime,
        location: e.location || null,
        html_link: e.htmlLink || null,
      }))
  }

  // ========== JOB SYNC ==========

  static async syncJobToCalendar(
    organizationId: string,
    jobId: string,
    calendarId: string = 'primary'
  ): Promise<string> {
    const supabase = await createClient();
    const calendar = await this.getCalendarClient(organizationId);

    // Get job details. Pulling job-site address fields (not the customer's
    // home address) because remediation work happens at the property, not
    // the customer's residence.
    const { data: job } = await supabase
      .from('jobs')
      .select(`
        id, job_number, name, status,
        scheduled_start_date, scheduled_start_time,
        scheduled_end_date, scheduled_end_time,
        estimated_duration_hours,
        job_address, job_city, job_state, job_zip,
        customer:customers!customer_id(first_name, last_name, company_name)
      `)
      .eq('id', jobId)
      .single();

    if (!job) throw new SecureError('NOT_FOUND', 'Job not found');
    if (!job.scheduled_start_date) {
      throw new SecureError('VALIDATION_ERROR', 'Job has no scheduled start date — cannot sync to calendar');
    }

    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;
    const c = customer as { first_name?: string; last_name?: string; company_name?: string } | null;
    const customerName = c?.company_name ||
      `${c?.first_name || ''} ${c?.last_name || ''}`.trim() ||
      'Unknown Customer';

    const location = [job.job_address, job.job_city, job.job_state, job.job_zip]
      .filter(Boolean)
      .join(', ');

    // Check for existing sync
    const { data: existingSync } = await supabase
      .from('calendar_sync_events')
      .select('google_event_id')
      .eq('job_id', jobId)
      .eq('calendar_type', 'google')
      .maybeSingle();

    const eventBody: calendar_v3.Schema$Event = {
      summary: `Job: ${job.job_number} - ${customerName}`,
      description: `HazardOS Job #${job.job_number}${job.name ? ` — ${job.name}` : ''}\n\nCustomer: ${customerName}\nStatus: ${job.status}\n\nView in HazardOS: ${process.env.NEXT_PUBLIC_APP_URL}/jobs/${jobId}`,
      location,
      ...buildGoogleEventTiming(job),
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
      log.error(
        { 
          error: formatError(error, 'GOOGLE_DELETE_EVENT_ERROR'),
          eventId,
          calendarId,
          organizationId
        },
        'Failed to delete calendar event'
      );
    }

    // Remove sync record
    await supabase
      .from('calendar_sync_events')
      .delete()
      .eq('google_event_id', eventId);
  }
}
