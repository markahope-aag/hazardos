import { createClient } from '@/lib/supabase/server';
import { QuickBooksCard } from './quickbooks-card';
import { MailchimpCard } from '@/components/integrations/mailchimp-card';
import { HubSpotCard } from '@/components/integrations/hubspot-card';
import { GoogleCalendarCard } from '@/components/integrations/google-calendar-card';
import { OutlookCalendarCard } from '@/components/integrations/outlook-calendar-card';
import { SyncHistoryTable } from './sync-history-table';

export default async function IntegrationsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id)
    .single();

  // Get all integrations
  const { data: integrations } = await supabase
    .from('organization_integrations')
    .select('id, organization_id, integration_type, access_token, refresh_token, token_expires_at, external_id, is_active, last_sync_at, last_error, settings, created_at, updated_at')
    .eq('organization_id', profile?.organization_id);

  const quickbooksIntegration = integrations?.find(i => i.integration_type === 'quickbooks') || null;
  const mailchimpIntegration = integrations?.find(i => i.integration_type === 'mailchimp') || null;
  const hubspotIntegration = integrations?.find(i => i.integration_type === 'hubspot') || null;
  const googleCalendarIntegration = integrations?.find(i => i.integration_type === 'google_calendar') || null;
  const outlookCalendarIntegration = integrations?.find(i => i.integration_type === 'outlook_calendar') || null;

  // Get recent sync logs
  const { data: syncLogs } = await supabase
    .from('integration_sync_log')
    .select('id, organization_id, integration_type, sync_type, direction, status, records_processed, records_succeeded, records_failed, errors, error_message, started_at, completed_at, duration_ms')
    .eq('organization_id', profile?.organization_id)
    .order('started_at', { ascending: false })
    .limit(10);

  const hasActiveIntegration = integrations?.some(i => i.is_active);

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect HazardOS with your accounting, marketing, calendar, and business tools
        </p>
      </div>

      <div className="space-y-8">
        {/* Accounting Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Accounting</h2>
          <div className="grid gap-6">
            <QuickBooksCard integration={quickbooksIntegration} />
          </div>
        </div>

        {/* Marketing Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Marketing</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <MailchimpCard integration={mailchimpIntegration} />
            <HubSpotCard integration={hubspotIntegration} />
          </div>
        </div>

        {/* Calendar Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Calendar</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <GoogleCalendarCard integration={googleCalendarIntegration} />
            <OutlookCalendarCard integration={outlookCalendarIntegration} />
          </div>
        </div>

        {/* Sync History */}
        {hasActiveIntegration && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sync History</h2>
            <SyncHistoryTable logs={syncLogs || []} />
          </div>
        )}
      </div>
    </div>
  );
}
