'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Globe, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { WhiteLabelConfig, CustomDomain } from '@/types/integrations';

interface BrandingFormProps {
  enabled: boolean;
  config: WhiteLabelConfig;
  domains: CustomDomain[];
}

export function BrandingForm({ enabled, config, domains }: BrandingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(enabled);
  const [companyName, setCompanyName] = useState(config.company_name || '');
  const [logoUrl, setLogoUrl] = useState(config.logo_url || '');
  const [faviconUrl, setFaviconUrl] = useState(config.favicon_url || '');
  const [primaryColor, setPrimaryColor] = useState(config.primary_color || '#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState(config.secondary_color || '#1e40af');
  const [hidePoweredBy, setHidePoweredBy] = useState(config.hide_powered_by || false);
  const [newDomain, setNewDomain] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          white_label_enabled: whiteLabelEnabled,
          config: {
            company_name: companyName,
            logo_url: logoUrl,
            favicon_url: faviconUrl,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            hide_powered_by: hidePoweredBy,
          },
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Branding settings saved' });
        router.refresh();
      } else {
        throw new Error('Failed to save');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save branding settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain) return;

    setIsAddingDomain(true);
    try {
      const response = await fetch('/api/settings/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Domain added. Please configure DNS.' });
        setNewDomain('');
        router.refresh();
      } else {
        throw new Error('Failed to add domain');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add domain',
        variant: 'destructive',
      });
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch(`/api/settings/domains/${domainId}/verify`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.verified) {
        toast({ title: 'Success', description: 'Domain verified!' });
        router.refresh();
      } else {
        toast({
          title: 'Verification Failed',
          description: result.error || 'DNS records not found',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to verify domain',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;

    try {
      await fetch(`/api/settings/domains/${domainId}`, { method: 'DELETE' });
      toast({ title: 'Success', description: 'Domain removed' });
      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to remove domain',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>White Label</CardTitle>
              <CardDescription>
                Enable white labeling to customize the platform appearance
              </CardDescription>
            </div>
            <Switch
              checked={whiteLabelEnabled}
              onCheckedChange={setWhiteLabelEnabled}
            />
          </div>
        </CardHeader>
      </Card>

      {whiteLabelEnabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize colors and logos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    type="url"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="hidePoweredBy"
                  checked={hidePoweredBy}
                  onCheckedChange={setHidePoweredBy}
                />
                <Label htmlFor="hidePoweredBy">Hide &quot;Powered by HazardOS&quot; footer</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Domains</CardTitle>
              <CardDescription>
                Use your own domain for the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="app.yourcompany.com"
                />
                <Button onClick={handleAddDomain} disabled={isAddingDomain || !newDomain}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingDomain ? 'Adding...' : 'Add Domain'}
                </Button>
              </div>

              {domains.length > 0 && (
                <div className="space-y-2">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{domain.domain}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant={domain.is_verified ? 'default' : 'secondary'}
                              className={domain.is_verified ? 'bg-green-500' : ''}
                            >
                              {domain.is_verified ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending Verification
                                </>
                              )}
                            </Badge>
                            {domain.is_verified && (
                              <Badge variant="outline">
                                SSL: {domain.ssl_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!domain.is_verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyDomain(domain.id)}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDomain(domain.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
