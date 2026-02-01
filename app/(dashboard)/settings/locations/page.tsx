import { createClient } from '@/lib/supabase/server';
import { LocationService } from '@/lib/services/location-service';
import { LocationList } from '@/components/settings/location-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function LocationsPage() {
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

  const locations = await LocationService.list(profile.organization_id);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted-foreground">
            Manage multiple office locations and service areas
          </p>
        </div>
        <Link href="/settings/locations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </div>

      <LocationList locations={locations} />
    </div>
  );
}
