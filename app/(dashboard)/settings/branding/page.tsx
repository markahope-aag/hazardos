import { WhiteLabelService } from '@/lib/services/white-label-service';
import { BrandingForm } from '@/components/settings/branding-form';
import { requireTenantAdmin } from '@/lib/auth/require-roles';

export default async function BrandingPage() {
  const { profile } = await requireTenantAdmin();

  const { enabled, config } = await WhiteLabelService.getConfig(profile.organization_id);
  const domains = await WhiteLabelService.listDomains(profile.organization_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branding</h1>
        <p className="text-muted-foreground">
          Customize the look and feel of your HazardOS instance
        </p>
      </div>

      <BrandingForm
        enabled={enabled}
        config={config}
        domains={domains}
      />
    </div>
  );
}
