'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Truck, ParkingCircle, DoorOpen, ArrowUpDown } from 'lucide-react'
import type { SiteSurvey, SurveyAccessInfo } from '@/types/database'

interface AccessSectionProps {
  survey: SiteSurvey
}

export function AccessSection({ survey }: AccessSectionProps) {
  const accessInfo = survey.access_info as SurveyAccessInfo | null

  if (!accessInfo) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No access information documented in this survey.
        </CardContent>
      </Card>
    )
  }

  const equipmentAccessLabels: Record<string, string> = {
    adequate: 'Adequate',
    limited: 'Limited',
    difficult: 'Difficult',
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Access Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Access Restrictions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Has Restrictions</span>
            <Badge variant={accessInfo.hasRestrictions ? 'destructive' : 'secondary'}>
              {accessInfo.hasRestrictions ? 'Yes' : 'No'}
            </Badge>
          </div>

          {accessInfo.restrictions && accessInfo.restrictions.length > 0 && (
            <div>
              <label className="text-sm text-muted-foreground">Restriction Types</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {accessInfo.restrictions.map((restriction, i) => (
                  <Badge key={i} variant="outline">
                    {restriction.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {accessInfo.restrictionNotes && (
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              <p className="text-sm mt-1">{accessInfo.restrictionNotes}</p>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Min Doorway Width</span>
              <span className="font-medium">{accessInfo.minDoorwayWidth || 32}" </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parking & Loading */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ParkingCircle className="h-5 w-5" />
            Parking & Loading
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Parking Available</span>
            <Badge variant={accessInfo.parkingAvailable ? 'default' : 'secondary'}>
              {accessInfo.parkingAvailable === null ? 'Unknown' : accessInfo.parkingAvailable ? 'Yes' : 'No'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Loading Zone Available</span>
            <Badge variant={accessInfo.loadingZoneAvailable ? 'default' : 'secondary'}>
              {accessInfo.loadingZoneAvailable === null ? 'Unknown' : accessInfo.loadingZoneAvailable ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Equipment Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Equipment Access</span>
            <Badge
              variant={
                accessInfo.equipmentAccess === 'adequate'
                  ? 'default'
                  : accessInfo.equipmentAccess === 'limited'
                  ? 'secondary'
                  : 'destructive'
              }
            >
              {accessInfo.equipmentAccess
                ? equipmentAccessLabels[accessInfo.equipmentAccess]
                : 'Not Assessed'}
            </Badge>
          </div>

          {accessInfo.equipmentAccessNotes && (
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              <p className="text-sm mt-1">{accessInfo.equipmentAccessNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Building Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Building Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Elevator Available</span>
            <Badge variant={accessInfo.elevatorAvailable ? 'default' : 'secondary'}>
              {accessInfo.elevatorAvailable === null ? 'Unknown' : accessInfo.elevatorAvailable ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Legacy Access Issues */}
      {survey.access_issues && survey.access_issues.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Legacy Access Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {survey.access_issues.map((issue, index) => (
                <Badge key={index} variant="outline">
                  {issue}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
