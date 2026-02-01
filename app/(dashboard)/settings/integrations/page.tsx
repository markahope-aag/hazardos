import { createClient } from '@/lib/supabase/server';
import { QuickBooksCard } from './quickbooks-card';
import { SyncHistoryTable } from './sync-history-table';

export default async function IntegrationsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id)
    .single();

  // Get integration status
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .eq('integration_type', 'quickbooks')
    .maybeSingle();

  // Get recent sync logs
  const { data: syncLogs } = await supabase
    .from('integration_sync_log')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .order('started_at', { ascending: false })
    .limit(10);

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect HazardOS with your accounting and business tools
        </p>
      </div>

      <div className="grid gap-6">
        <QuickBooksCard integration={integration} />

        {integration?.is_active && (
          <SyncHistoryTable logs={syncLogs || []} />
        )}
      </div>
    </div>
  );
}
