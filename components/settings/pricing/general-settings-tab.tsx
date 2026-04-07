'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import type { PricingTabProps } from './types'

interface SettingsForm {
  default_markup_percent: number
  minimum_markup_percent: number
  maximum_markup_percent: number
  office_address_line1: string
  office_city: string
  office_state: string
  office_zip: string
}

export function GeneralSettingsTab({ data, onDataChange }: PricingTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    default_markup_percent: 25,
    minimum_markup_percent: 10,
    maximum_markup_percent: 50,
    office_address_line1: '',
    office_city: '',
    office_state: '',
    office_zip: '',
  })

  useEffect(() => {
    if (data.settings) {
      setSettingsForm({
        default_markup_percent: data.settings.default_markup_percent || 25,
        minimum_markup_percent: data.settings.minimum_markup_percent || 10,
        maximum_markup_percent: data.settings.maximum_markup_percent || 50,
        office_address_line1: data.settings.office_address_line1 || '',
        office_city: data.settings.office_city || '',
        office_state: data.settings.office_state || '',
        office_zip: data.settings.office_zip || '',
      })
    }
  }, [data.settings])

  const saveGeneralSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      toast({ title: 'Success', description: 'Settings saved successfully' })
      onDataChange()
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Pricing Settings</CardTitle>
        <CardDescription>Configure markup percentages and office location for distance calculations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Default Markup %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={settingsForm.default_markup_percent}
              onChange={(e) => setSettingsForm(prev => ({ ...prev, default_markup_percent: parseFloat(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum Markup %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={settingsForm.minimum_markup_percent}
              onChange={(e) => setSettingsForm(prev => ({ ...prev, minimum_markup_percent: parseFloat(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum Markup %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={settingsForm.maximum_markup_percent}
              onChange={(e) => setSettingsForm(prev => ({ ...prev, maximum_markup_percent: parseFloat(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Office Address (for travel distance calculations)</h3>
          <div className="space-y-2">
            <Label>Street Address</Label>
            <Input
              value={settingsForm.office_address_line1}
              onChange={(e) => setSettingsForm(prev => ({ ...prev, office_address_line1: e.target.value }))}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={settingsForm.office_city}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, office_city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={settingsForm.office_state}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, office_state: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                value={settingsForm.office_zip}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, office_zip: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Button onClick={saveGeneralSettings} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  )
}
