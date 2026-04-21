'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Clock, Wrench, Package, Truck, AlertTriangle, Settings } from 'lucide-react'
import type { PricingData } from '@/components/settings/pricing/types'
import { GeneralSettingsTab } from '@/components/settings/pricing/general-settings-tab'
import { LaborRatesTab } from '@/components/settings/pricing/labor-rates-tab'
import { EquipmentRatesTab } from '@/components/settings/pricing/equipment-rates-tab'
import { MaterialCostsTab } from '@/components/settings/pricing/material-costs-tab'
import { DisposalFeesTab } from '@/components/settings/pricing/disposal-fees-tab'
import { TravelRatesTab } from '@/components/settings/pricing/travel-rates-tab'

export default function PricingSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PricingData>({
    labor_rates: [],
    equipment_rates: [],
    material_costs: [],
    disposal_fees: [],
    travel_rates: [],
    settings: null,
  })

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/pricing')
      const result = await response.json()
      setData(result)
    } catch {
      toast({ title: 'Error', description: 'Failed to load pricing data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const tabProps = { data, onDataChange: fetchData }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pricing Settings</h1>
        <p className="text-muted-foreground">Configure rates and costs for estimates</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          {([
            ['general', Settings, 'General'],
            ['labor', Clock, 'Labor'],
            ['equipment', Wrench, 'Equipment'],
            ['materials', Package, 'Materials'],
            ['disposal', AlertTriangle, 'Disposal'],
            ['travel', Truck, 'Travel'],
          ] as const).map(([value, Icon, label]) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-1">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general"><GeneralSettingsTab {...tabProps} /></TabsContent>
        <TabsContent value="labor"><LaborRatesTab {...tabProps} /></TabsContent>
        <TabsContent value="equipment"><EquipmentRatesTab {...tabProps} /></TabsContent>
        <TabsContent value="materials"><MaterialCostsTab {...tabProps} /></TabsContent>
        <TabsContent value="disposal"><DisposalFeesTab {...tabProps} /></TabsContent>
        <TabsContent value="travel"><TravelRatesTab {...tabProps} /></TabsContent>
      </Tabs>
    </div>
  )
}
