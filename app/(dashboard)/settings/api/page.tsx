import { createClient } from '@/lib/supabase/server';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { ApiKeyList } from '@/components/settings/api-key-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function ApiKeysPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id)
    .single();

  if (!profile?.organization_id) {
    return <div>No organization found</div>;
  }

  const apiKeys = await ApiKeyService.list(profile.organization_id);
  const availableScopes = ApiKeyService.getAvailableScopes();

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to your data
          </p>
        </div>
        <Link href="/settings/api/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </Link>
      </div>

      <ApiKeyList apiKeys={apiKeys} availableScopes={availableScopes} />
    </div>
  );
}
