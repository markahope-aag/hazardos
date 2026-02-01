import { createClient } from '@/lib/supabase/server';
import { WhiteLabelService } from '@/lib/services/white-label-service';
import { BrandingForm } from '@/components/settings/branding-form';

export default async function BrandingPage() {
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

  const { enabled, config } = await WhiteLabelService.getConfig(profile.organization_id);
  const domains = await WhiteLabelService.listDomains(profile.organization_id);

  return (
    <div className="container py-6">
      <div className="mb-6">
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
