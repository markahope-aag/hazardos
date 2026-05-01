import { LocationService } from '@/lib/services/location-service';
import { LocationList } from '@/components/settings/location-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { requireTenantAdmin } from '@/lib/auth/require-roles';

export default async function LocationsPage() {
  const { profile } = await requireTenantAdmin();
  const locations = await LocationService.list(profile.organization_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
