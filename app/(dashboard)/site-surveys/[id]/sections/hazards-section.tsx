'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AlertTriangle, Check, X } from 'lucide-react'
import type { SurveyHazardAssessments } from '@/types/database'

interface HazardsSectionProps {
  hazardAssessments: SurveyHazardAssessments | null
  hazardType: string
}

const hazardLabels: Record<string, string> = {
  asbestos: 'Asbestos',
  mold: 'Mold',
  lead: 'Lead Paint',
  other: 'Other Hazards',
}

const containmentLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Minimal Containment', color: 'bg-green-100 text-green-700' },
  2: { label: 'Limited Containment', color: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'Full Containment', color: 'bg-orange-100 text-orange-700' },
  4: { label: 'Critical Containment', color: 'bg-red-100 text-red-700' },
}

export function HazardsSection({ hazardAssessments, hazardType }: HazardsSectionProps) {
  const hasDetailedAssessments =
    hazardAssessments &&
    (hazardAssessments.asbestos ||
      hazardAssessments.mold ||
      hazardAssessments.lead ||
      hazardAssessments.other)

  if (!hasDetailedAssessments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Hazard Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              No detailed hazard assessments documented.
            </p>
            {hazardType && (
              <div>
                <span className="text-sm text-muted-foreground">Primary Hazard Type: </span>
                <Badge variant="outline" className="capitalize">
                  {hazardType}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Documented Hazards
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Hazard types summary */}
        {hazardAssessments.types && hazardAssessments.types.length > 0 && (
          <div className="mb-4 pb-4 border-b">
            <label className="text-sm text-muted-foreground mb-2 block">Hazard Types Identified</label>
            <div className="flex flex-wrap gap-2">
              {hazardAssessments.types.map((type) => (
                <Badge key={type} variant="outline" className="capitalize">
                  {hazardLabels[type] || type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Accordion type="multiple" className="w-full">
          {/* Asbestos */}
          {hazardAssessments.asbestos && (
            <AccordionItem value="asbestos">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <span className="font-medium">Asbestos</span>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    {hazardAssessments.asbestos.materials.length} material(s)
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <AsbestosDetails data={hazardAssessments.asbestos} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Mold */}
          {hazardAssessments.mold && (
            <AccordionItem value="mold">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <span className="font-medium">Mold</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {hazardAssessments.mold.affectedAreas.length} area(s)
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <MoldDetails data={hazardAssessments.mold} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Lead */}
          {hazardAssessments.lead && (
            <AccordionItem value="lead">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <span className="font-medium">Lead Paint</span>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">
                    {hazardAssessments.lead.components.length} component(s)
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <LeadDetails data={hazardAssessments.lead} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Other */}
          {hazardAssessments.other && (
            <AccordionItem value="other">
              <AccordionTrigger>
                <span className="font-medium">Other Hazards</span>
              </AccordionTrigger>
              <AccordionContent>
                <OtherDetails data={hazardAssessments.other} />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}

function AsbestosDetails({ data }: { data: NonNullable<SurveyHazardAssessments['asbestos']> }) {
  return (
    <div className="space-y-4 pt-2">
      {/* Materials */}
      {data.materials.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Materials Identified</h4>
          <div className="grid gap-3">
            {data.materials.map((material) => (
              <div key={material.id} className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium capitalize">
                    {material.materialType?.replace('_', ' ') || 'Unknown Material'}
                  </span>
                  <Badge variant={material.friable ? 'destructive' : 'secondary'}>
                    {material.friable ? 'Friable' : 'Non-Friable'}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  {material.location && <p>Location: {material.location}</p>}
                  {material.quantity && (
                    <p>
                      Quantity: {material.quantity} {material.unit}
                    </p>
                  )}
                  {material.condition && <p>Condition: {material.condition}</p>}
                  {material.pipeDiameter && <p>Pipe Diameter: {material.pipeDiameter}"</p>}
                  {material.notes && <p className="italic mt-2">{material.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        {data.containmentLevel && (
          <div>
            <label className="text-sm text-muted-foreground">Containment Level</label>
            <Badge className={containmentLabels[data.containmentLevel]?.color || ''}>
              {containmentLabels[data.containmentLevel]?.label || `Level ${data.containmentLevel}`}
            </Badge>
          </div>
        )}
        {data.estimatedWasteVolume && (
          <div>
            <label className="text-sm text-muted-foreground">Estimated Waste Volume</label>
            <p className="font-medium">{data.estimatedWasteVolume} cu ft</p>
          </div>
        )}
        <div>
          <label className="text-sm text-muted-foreground">EPA Notification Required</label>
          <div className="flex items-center gap-1 mt-1">
            {data.epaNotificationRequired ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-gray-400" />
            )}
            <span>{data.epaNotificationRequired ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MoldDetails({ data }: { data: NonNullable<SurveyHazardAssessments['mold']> }) {
  return (
    <div className="space-y-4 pt-2">
      {/* Moisture Source */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <h4 className="font-medium mb-2">Moisture Source</h4>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Identified:</span>
          <Badge variant={data.moistureSourceIdentified ? 'default' : 'secondary'}>
            {data.moistureSourceIdentified ? 'Yes' : 'No'}
          </Badge>
        </div>
        {data.moistureSourceTypes && data.moistureSourceTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {data.moistureSourceTypes.map((type, i) => (
              <Badge key={i} variant="outline">
                {type.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}
        {data.moistureSourceStatus && (
          <p className="text-sm">
            Status: <span className="capitalize">{data.moistureSourceStatus}</span>
          </p>
        )}
        {data.moistureSourceNotes && (
          <p className="text-sm text-muted-foreground mt-2">{data.moistureSourceNotes}</p>
        )}
      </div>

      {/* Affected Areas */}
      {data.affectedAreas.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Affected Areas</h4>
          <div className="grid gap-3">
            {data.affectedAreas.map((area) => (
              <div key={area.id} className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium">{area.location || 'Unknown Location'}</span>
                  {area.severity && (
                    <Badge
                      variant={
                        area.severity === 'severe'
                          ? 'destructive'
                          : area.severity === 'moderate'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {area.severity}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  {area.squareFootage && <p>Area: {area.squareFootage} sq ft</p>}
                  {area.materialType && <p>Material: {area.materialType}</p>}
                  {area.moistureReading && <p>Moisture Reading: {area.moistureReading}%</p>}
                  {area.materialsAffected && area.materialsAffected.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {area.materialsAffected.map((mat, i) => (
                        <span key={i} className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                          {mat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        {data.sizeCategory && (
          <div>
            <label className="text-sm text-muted-foreground">Size Category</label>
            <p className="font-medium capitalize">{data.sizeCategory.replace('_', ' ')}</p>
          </div>
        )}
        {data.odorLevel && (
          <div>
            <label className="text-sm text-muted-foreground">Odor Level</label>
            <p className="font-medium capitalize">{data.odorLevel}</p>
          </div>
        )}
        <div>
          <label className="text-sm text-muted-foreground">HVAC Contaminated</label>
          <p className="font-medium">{data.hvacContaminated ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  )
}

function LeadDetails({ data }: { data: NonNullable<SurveyHazardAssessments['lead']> }) {
  return (
    <div className="space-y-4 pt-2">
      {/* Work Scope */}
      <div className="grid grid-cols-2 gap-4">
        {data.workScope && (
          <div>
            <label className="text-sm text-muted-foreground">Work Scope</label>
            <p className="font-medium capitalize">{data.workScope.replace('_', ' ')}</p>
          </div>
        )}
        {data.workMethod && (
          <div>
            <label className="text-sm text-muted-foreground">Work Method</label>
            <p className="font-medium capitalize">{data.workMethod.replace('_', ' ')}</p>
          </div>
        )}
      </div>

      {/* Components */}
      {data.components.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Components with Lead Paint</h4>
          <div className="grid gap-3">
            {data.components.map((component) => (
              <div key={component.id} className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium capitalize">
                    {component.componentType?.replace('_', ' ') || 'Unknown Component'}
                  </span>
                  {component.condition && (
                    <Badge
                      variant={
                        component.condition === 'poor'
                          ? 'destructive'
                          : component.condition === 'fair'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {component.condition}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {component.location && <p>Location: {component.location}</p>}
                  {component.quantity && (
                    <p>
                      Quantity: {component.quantity} {component.unit}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <label className="text-sm text-muted-foreground">Children Under 6 Present</label>
          <p className="font-medium">{data.childrenUnder6Present ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">RRP Rule Applies</label>
          <Badge variant={data.rrpRuleApplies ? 'destructive' : 'secondary'}>
            {data.rrpRuleApplies ? 'Yes - RRP Required' : 'No'}
          </Badge>
        </div>
        {data.totalWorkArea > 0 && (
          <div>
            <label className="text-sm text-muted-foreground">Total Work Area</label>
            <p className="font-medium">{data.totalWorkArea} sq ft</p>
          </div>
        )}
      </div>
    </div>
  )
}

function OtherDetails({ data }: { data: NonNullable<SurveyHazardAssessments['other']> }) {
  return (
    <div className="space-y-4 pt-2">
      {data.description && (
        <div>
          <label className="text-sm text-muted-foreground">Description</label>
          <p className="mt-1">{data.description}</p>
        </div>
      )}
      {data.notes && (
        <div>
          <label className="text-sm text-muted-foreground">Notes</label>
          <p className="mt-1 text-muted-foreground">{data.notes}</p>
        </div>
      )}
    </div>
  )
}
