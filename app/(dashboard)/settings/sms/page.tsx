'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MessageSquare, Clock, Bell, Shield, Phone, Save, AlertTriangle } from 'lucide-react';
import type { OrganizationSmsSettings } from '@/types/sms';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
];

export default function SmsSettingsPage() {
  const [settings, setSettings] = useState<Partial<OrganizationSmsSettings>>({
    sms_enabled: false,
    appointment_reminders_enabled: true,
    appointment_reminder_hours: 24,
    job_status_updates_enabled: true,
    lead_notifications_enabled: true,
    payment_reminders_enabled: false,
    quiet_hours_enabled: true,
    quiet_hours_start: '21:00',
    quiet_hours_end: '08:00',
    timezone: 'America/Chicago',
    use_platform_twilio: false,
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/sms/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch SMS settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/sms/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof OrganizationSmsSettings>(
    key: K,
    value: OrganizationSmsSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SMS Settings</h1>
          <p className="text-muted-foreground">
            Configure SMS notifications for appointment reminders, job updates, and more.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          Settings saved successfully!
        </div>
      )}

      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle>SMS Notifications</CardTitle>
                <CardDescription>
                  Enable or disable all SMS functionality
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {settings.sms_enabled ? (
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
              <Switch
                checked={settings.sms_enabled}
                onCheckedChange={(checked) => updateSetting('sms_enabled', checked)}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-purple-500" />
            <div>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Choose which types of SMS notifications to send
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Appointment Reminders</p>
              <p className="text-sm text-muted-foreground">
                Send reminders before scheduled jobs
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="72"
                  className="w-20"
                  value={settings.appointment_reminder_hours}
                  onChange={(e) =>
                    updateSetting('appointment_reminder_hours', parseInt(e.target.value, 10) || 24)
                  }
                  disabled={!settings.appointment_reminders_enabled}
                />
                <span className="text-sm text-muted-foreground">hours before</span>
              </div>
              <Switch
                checked={settings.appointment_reminders_enabled}
                onCheckedChange={(checked) =>
                  updateSetting('appointment_reminders_enabled', checked)
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Job Status Updates</p>
              <p className="text-sm text-muted-foreground">
                Notify customers when crew is en route or job is complete
              </p>
            </div>
            <Switch
              checked={settings.job_status_updates_enabled}
              onCheckedChange={(checked) =>
                updateSetting('job_status_updates_enabled', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Lead Notifications</p>
              <p className="text-sm text-muted-foreground">
                Send confirmation when new leads are received
              </p>
            </div>
            <Switch
              checked={settings.lead_notifications_enabled}
              onCheckedChange={(checked) =>
                updateSetting('lead_notifications_enabled', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Payment Reminders</p>
              <p className="text-sm text-muted-foreground">
                Send reminders for unpaid invoices
              </p>
            </div>
            <Switch
              checked={settings.payment_reminders_enabled}
              onCheckedChange={(checked) =>
                updateSetting('payment_reminders_enabled', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours (TCPA Compliance) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                TCPA compliance: avoid sending messages during restricted hours
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-sm text-muted-foreground">
                Block SMS sending during nighttime hours
              </p>
            </div>
            <Switch
              checked={settings.quiet_hours_enabled}
              onCheckedChange={(checked) => updateSetting('quiet_hours_enabled', checked)}
            />
          </div>

          {settings.quiet_hours_enabled && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={settings.quiet_hours_start}
                  onChange={(e) => updateSetting('quiet_hours_start', e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={settings.quiet_hours_end}
                  onChange={(e) => updateSetting('quiet_hours_end', e.target.value)}
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => updateSetting('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace('America/', '').replace('Pacific/', '').replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Twilio Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-green-500" />
            <div>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>
                Configure your Twilio account to enable SMS notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
            <Shield className="h-4 w-4 inline mr-2" />
            You&apos;ll need a Twilio account to send SMS messages. Sign up at{' '}
            <a
              href="https://www.twilio.com/try-twilio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              twilio.com
            </a>{' '}
            and get your credentials from the Twilio Console.
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Twilio Account SID <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.twilio_account_sid || ''}
                onChange={(e) => updateSetting('twilio_account_sid', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found on your Twilio Console dashboard
              </p>
            </div>
            <div>
              <Label>Twilio Auth Token <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                placeholder="Your auth token"
                value={settings.twilio_auth_token || ''}
                onChange={(e) => updateSetting('twilio_auth_token', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found on your Twilio Console dashboard (click to reveal)
              </p>
            </div>
            <div>
              <Label>Twilio Phone Number <span className="text-red-500">*</span></Label>
              <Input
                type="tel"
                placeholder="+15551234567"
                value={settings.twilio_phone_number || ''}
                onChange={(e) => updateSetting('twilio_phone_number', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your Twilio phone number in E.164 format (e.g., +15551234567)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <MessageSquare className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">SMS Best Practices</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Customers must opt-in before receiving SMS messages</li>
                <li>Always include opt-out instructions (Reply STOP to unsubscribe)</li>
                <li>Respect quiet hours to comply with TCPA regulations</li>
                <li>Keep messages under 160 characters to avoid multi-segment charges</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
