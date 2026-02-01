import { SegmentBuilder } from '@/components/customers/segment-builder';
import { SegmentationService } from '@/lib/services/segmentation-service';

export default function NewSegmentPage() {
  const availableFields = SegmentationService.getAvailableFields();

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Segment</h1>
        <p className="text-muted-foreground">
          Define rules to automatically group customers
        </p>
      </div>

      <SegmentBuilder availableFields={availableFields} />
    </div>
  );
}
