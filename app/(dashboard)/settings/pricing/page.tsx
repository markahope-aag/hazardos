'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Wrench,
  Package,
  Truck,
  AlertTriangle,
  Settings,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import type {
  LaborRate,
  EquipmentRate,
  MaterialCost,
  DisposalFee,
  TravelRate,
  PricingSettings,
} from '@/types/pricing'
import { disposalHazardTypeConfig, commonUnits } from '@/types/pricing'
import { formatCurrency } from '@/lib/utils'

interface PricingData {
  labor_rates: LaborRate[]
  equipment_rates: EquipmentRate[]
  material_costs: MaterialCost[]
  disposal_fees: DisposalFee[]
  travel_rates: TravelRate[]
  settings: PricingSettings | null
}

export default function PricingSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<PricingData>({
    labor_rates: [],
    equipment_rates: [],
    material_costs: [],
    disposal_fees: [],
    travel_rates: [],
    settings: null,
  })

  // Dialog states
  const [laborDialog, setLaborDialog] = useState(false)
  const [equipmentDialog, setEquipmentDialog] = useState(false)
  const [materialDialog, setMaterialDialog] = useState(false)
  const [disposalDialog, setDisposalDialog] = useState(false)
  const [travelDialog, setTravelDialog] = useState(false)

  // Edit states
  const [editingLabor, setEditingLabor] = useState<LaborRate | null>(null)
  const [editingEquipment, setEditingEquipment] = useState<EquipmentRate | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<MaterialCost | null>(null)
  const [editingDisposal, setEditingDisposal] = useState<DisposalFee | null>(null)
  const [editingTravel, setEditingTravel] = useState<TravelRate | null>(null)

  // General settings form
  const [settingsForm, setSettingsForm] = useState({
    default_markup_percent: 25,
    minimum_markup_percent: 10,
    maximum_markup_percent: 50,
    office_address_line1: '',
    office_city: '',
    office_state: '',
    office_zip: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/pricing')
      const result = await response.json()
      setData(result)
      if (result.settings) {
        setSettingsForm({
          default_markup_percent: result.settings.default_markup_percent || 25,
          minimum_markup_percent: result.settings.minimum_markup_percent || 10,
          maximum_markup_percent: result.settings.maximum_markup_percent || 50,
          office_address_line1: result.settings.office_address_line1 || '',
          office_city: result.settings.office_city || '',
          office_state: result.settings.office_state || '',
          office_zip: result.settings.office_zip || '',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load pricing data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Labor Rate handlers
  const saveLaborRate = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editingLabor?.id,
        name: formData.get('name'),
        rate_per_hour: parseFloat(formData.get('rate_per_hour') as string),
        description: formData.get('description') || null,
        is_default: formData.get('is_default') === 'on',
      }

      const response = await fetch('/api/settings/pricing/labor-rates', {
        method: editingLabor ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save labor rate')

      toast({ title: 'Success', description: 'Labor rate saved' })
      setLaborDialog(false)
      setEditingLabor(null)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to save labor rate', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteLaborRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this labor rate?')) return

    try {
      await fetch(`/api/settings/pricing/labor-rates?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: 'Labor rate deleted' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  // Equipment Rate handlers
  const saveEquipmentRate = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editingEquipment?.id,
        name: formData.get('name'),
        rate_per_day: parseFloat(formData.get('rate_per_day') as string),
        description: formData.get('description') || null,
      }

      const response = await fetch('/api/settings/pricing/equipment-rates', {
        method: editingEquipment ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save equipment rate')

      toast({ title: 'Success', description: 'Equipment rate saved' })
      setEquipmentDialog(false)
      setEditingEquipment(null)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to save equipment rate', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteEquipmentRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment rate?')) return

    try {
      await fetch(`/api/settings/pricing/equipment-rates?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: 'Equipment rate deleted' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  // Material Cost handlers
  const saveMaterialCost = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editingMaterial?.id,
        name: formData.get('name'),
        cost_per_unit: parseFloat(formData.get('cost_per_unit') as string),
        unit: formData.get('unit'),
        description: formData.get('description') || null,
      }

      const response = await fetch('/api/settings/pricing/material-costs', {
        method: editingMaterial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save material cost')

      toast({ title: 'Success', description: 'Material cost saved' })
      setMaterialDialog(false)
      setEditingMaterial(null)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to save material cost', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteMaterialCost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material cost?')) return

    try {
      await fetch(`/api/settings/pricing/material-costs?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: 'Material cost deleted' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  // Disposal Fee handlers
  const saveDisposalFee = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editingDisposal?.id,
        hazard_type: formData.get('hazard_type'),
        cost_per_cubic_yard: parseFloat(formData.get('cost_per_cubic_yard') as string),
        description: formData.get('description') || null,
      }

      const response = await fetch('/api/settings/pricing/disposal-fees', {
        method: editingDisposal ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save disposal fee')

      toast({ title: 'Success', description: 'Disposal fee saved' })
      setDisposalDialog(false)
      setEditingDisposal(null)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to save disposal fee', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteDisposalFee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disposal fee?')) return

    try {
      await fetch(`/api/settings/pricing/disposal-fees?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: 'Disposal fee deleted' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  // Travel Rate handlers
  const saveTravelRate = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editingTravel?.id,
        min_miles: parseInt(formData.get('min_miles') as string),
        max_miles: formData.get('max_miles') ? parseInt(formData.get('max_miles') as string) : null,
        flat_fee: formData.get('flat_fee') ? parseFloat(formData.get('flat_fee') as string) : null,
        per_mile_rate: formData.get('per_mile_rate') ? parseFloat(formData.get('per_mile_rate') as string) : null,
      }

      const response = await fetch('/api/settings/pricing/travel-rates', {
        method: editingTravel ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save travel rate')

      toast({ title: 'Success', description: 'Travel rate saved' })
      setTravelDialog(false)
      setEditingTravel(null)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to save travel rate', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteTravelRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this travel rate?')) return

    try {
      await fetch(`/api/settings/pricing/travel-rates?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: 'Travel rate deleted' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild aria-label="Back to settings">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Pricing Settings</h1>
          <p className="text-muted-foreground">Configure rates and costs for estimates</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="labor" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Labor</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Equipment</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Materials</span>
          </TabsTrigger>
          <TabsTrigger value="disposal" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Disposal</span>
          </TabsTrigger>
          <TabsTrigger value="travel" className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Travel</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
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
        </TabsContent>

        {/* Labor Rates Tab */}
        <TabsContent value="labor">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Labor Rates</CardTitle>
                <CardDescription>Hourly rates for different worker types</CardDescription>
              </div>
              <Button onClick={() => { setEditingLabor(null); setLaborDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate/Hour</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.labor_rates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No labor rates configured yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.labor_rates.map(rate => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.name}</TableCell>
                        <TableCell>{formatCurrency(rate.rate_per_hour)}</TableCell>
                        <TableCell className="text-muted-foreground">{rate.description || '-'}</TableCell>
                        <TableCell>
                          {rate.is_default && <Badge variant="secondary">Default</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingLabor(rate); setLaborDialog(true); }}
                              aria-label="Edit labor rate"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteLaborRate(rate.id)}
                              aria-label="Delete labor rate"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Rates Tab */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Equipment Rates</CardTitle>
                <CardDescription>Daily rental rates for equipment</CardDescription>
              </div>
              <Button onClick={() => { setEditingEquipment(null); setEquipmentDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate/Day</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.equipment_rates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No equipment rates configured yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.equipment_rates.map(rate => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.name}</TableCell>
                        <TableCell>{formatCurrency(rate.rate_per_day)}</TableCell>
                        <TableCell className="text-muted-foreground">{rate.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingEquipment(rate); setEquipmentDialog(true); }}
                              aria-label="Edit equipment rate"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEquipmentRate(rate.id)}
                              aria-label="Delete equipment rate"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Material Costs</CardTitle>
                <CardDescription>Unit costs for materials and supplies</CardDescription>
              </div>
              <Button onClick={() => { setEditingMaterial(null); setMaterialDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Cost/Unit</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.material_costs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No material costs configured yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.material_costs.map(material => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell>{formatCurrency(material.cost_per_unit)}</TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell className="text-muted-foreground">{material.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingMaterial(material); setMaterialDialog(true); }}
                              aria-label="Edit material cost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMaterialCost(material.id)}
                              aria-label="Delete material cost"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disposal Fees Tab */}
        <TabsContent value="disposal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Disposal Fees</CardTitle>
                <CardDescription>Hazardous waste disposal costs per cubic yard</CardDescription>
              </div>
              <Button onClick={() => { setEditingDisposal(null); setDisposalDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hazard Type</TableHead>
                    <TableHead>Cost/Cu. Yd</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.disposal_fees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No disposal fees configured yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.disposal_fees.map(fee => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">
                          {disposalHazardTypeConfig[fee.hazard_type]?.label || fee.hazard_type}
                        </TableCell>
                        <TableCell>{formatCurrency(fee.cost_per_cubic_yard)}</TableCell>
                        <TableCell className="text-muted-foreground">{fee.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingDisposal(fee); setDisposalDialog(true); }}
                              aria-label="Edit disposal fee"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteDisposalFee(fee.id)}
                              aria-label="Delete disposal fee"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Travel Rates Tab */}
        <TabsContent value="travel">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Travel Rates</CardTitle>
                <CardDescription>Distance-based travel fees</CardDescription>
              </div>
              <Button onClick={() => { setEditingTravel(null); setTravelDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distance Range</TableHead>
                    <TableHead>Flat Fee</TableHead>
                    <TableHead>Per Mile Rate</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.travel_rates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No travel rates configured yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.travel_rates.map(rate => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {rate.min_miles} - {rate.max_miles ? `${rate.max_miles} miles` : 'unlimited'}
                        </TableCell>
                        <TableCell>{rate.flat_fee ? formatCurrency(rate.flat_fee) : '-'}</TableCell>
                        <TableCell>{rate.per_mile_rate ? `${formatCurrency(rate.per_mile_rate)}/mile` : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingTravel(rate); setTravelDialog(true); }}
                              aria-label="Edit travel rate"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTravelRate(rate.id)}
                              aria-label="Delete travel rate"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Labor Rate Dialog */}
      <Dialog open={laborDialog} onOpenChange={setLaborDialog}>
        <DialogContent>
          <form action={saveLaborRate}>
            <DialogHeader>
              <DialogTitle>{editingLabor ? 'Edit Labor Rate' : 'Add Labor Rate'}</DialogTitle>
              <DialogDescription>Configure an hourly rate for a worker type</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingLabor?.name} placeholder="e.g., Technician" required />
              </div>
              <div className="space-y-2">
                <Label>Rate per Hour *</Label>
                <Input name="rate_per_hour" type="number" step="0.01" min="0" defaultValue={editingLabor?.rate_per_hour} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editingLabor?.description || ''} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox name="is_default" id="is_default" defaultChecked={editingLabor?.is_default} />
                <Label htmlFor="is_default">Set as default rate</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLaborDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Equipment Rate Dialog */}
      <Dialog open={equipmentDialog} onOpenChange={setEquipmentDialog}>
        <DialogContent>
          <form action={saveEquipmentRate}>
            <DialogHeader>
              <DialogTitle>{editingEquipment ? 'Edit Equipment Rate' : 'Add Equipment Rate'}</DialogTitle>
              <DialogDescription>Configure a daily rental rate for equipment</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingEquipment?.name} placeholder="e.g., HEPA Vacuum" required />
              </div>
              <div className="space-y-2">
                <Label>Rate per Day *</Label>
                <Input name="rate_per_day" type="number" step="0.01" min="0" defaultValue={editingEquipment?.rate_per_day} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editingEquipment?.description || ''} placeholder="Optional description" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEquipmentDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Material Cost Dialog */}
      <Dialog open={materialDialog} onOpenChange={setMaterialDialog}>
        <DialogContent>
          <form action={saveMaterialCost}>
            <DialogHeader>
              <DialogTitle>{editingMaterial ? 'Edit Material Cost' : 'Add Material Cost'}</DialogTitle>
              <DialogDescription>Configure a unit cost for materials</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingMaterial?.name} placeholder="e.g., Poly Sheeting" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost per Unit *</Label>
                  <Input name="cost_per_unit" type="number" step="0.01" min="0" defaultValue={editingMaterial?.cost_per_unit} required />
                </div>
                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Select name="unit" defaultValue={editingMaterial?.unit || 'each'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {commonUnits.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editingMaterial?.description || ''} placeholder="Optional description" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMaterialDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disposal Fee Dialog */}
      <Dialog open={disposalDialog} onOpenChange={setDisposalDialog}>
        <DialogContent>
          <form action={saveDisposalFee}>
            <DialogHeader>
              <DialogTitle>{editingDisposal ? 'Edit Disposal Fee' : 'Add Disposal Fee'}</DialogTitle>
              <DialogDescription>Configure disposal cost per cubic yard by hazard type</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Hazard Type *</Label>
                <Select name="hazard_type" defaultValue={editingDisposal?.hazard_type || 'asbestos_friable'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(disposalHazardTypeConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cost per Cubic Yard *</Label>
                <Input name="cost_per_cubic_yard" type="number" step="0.01" min="0" defaultValue={editingDisposal?.cost_per_cubic_yard} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editingDisposal?.description || ''} placeholder="Optional description" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDisposalDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Travel Rate Dialog */}
      <Dialog open={travelDialog} onOpenChange={setTravelDialog}>
        <DialogContent>
          <form action={saveTravelRate}>
            <DialogHeader>
              <DialogTitle>{editingTravel ? 'Edit Travel Rate' : 'Add Travel Rate'}</DialogTitle>
              <DialogDescription>Configure travel fees based on distance</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Miles *</Label>
                  <Input name="min_miles" type="number" min="0" defaultValue={editingTravel?.min_miles || 0} required />
                </div>
                <div className="space-y-2">
                  <Label>Max Miles</Label>
                  <Input name="max_miles" type="number" min="0" defaultValue={editingTravel?.max_miles || ''} placeholder="Leave empty for unlimited" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Flat Fee</Label>
                  <Input name="flat_fee" type="number" step="0.01" min="0" defaultValue={editingTravel?.flat_fee || ''} placeholder="Fixed fee" />
                </div>
                <div className="space-y-2">
                  <Label>Per Mile Rate</Label>
                  <Input name="per_mile_rate" type="number" step="0.01" min="0" defaultValue={editingTravel?.per_mile_rate || ''} placeholder="Rate per mile" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Provide either a flat fee, per mile rate, or both</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTravelDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
