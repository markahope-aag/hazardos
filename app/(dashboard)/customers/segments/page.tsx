import { createClient } from '@/lib/supabase/server';
import { SegmentationService } from '@/lib/services/segmentation-service';
import { SegmentList } from '@/components/customers/segment-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function SegmentsPage() {
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

  const segments = await SegmentationService.list(profile.organization_id);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customer Segments</h1>
          <p className="text-muted-foreground">
            Create and manage customer segments for targeted marketing
          </p>
        </div>
        <Link href="/customers/segments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Segment
          </Button>
        </Link>
      </div>

      <SegmentList segments={segments} />
    </div>
  );
}
