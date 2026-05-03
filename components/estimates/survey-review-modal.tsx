'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Thermometer,
  AlertTriangle,
  StickyNote,
  Loader2,
  ExternalLink,
  Camera,
  ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSignedSurveyMediaUrls } from '@/lib/services/photo-upload-service'
import type {
  SiteSurvey,
  SurveyEnvironmentInfo,
  SurveyPhotoMetadata,
} from '@/types/database'
import type { HazardsData } from '@/lib/stores/survey-types'

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">
        {value === null || value === undefined || value === '' ? '—' : value}
      </span>
    </div>
  )
}

function formatLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface SurveyReviewModalProps {
  surveyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SurveyReviewModal({ surveyId, open, onOpenChange }: SurveyReviewModalProps) {
  const [survey, setSurvey] = useState<SiteSurvey | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !surveyId) return

    let cancelled = false
    setLoading(true)

    const supabase = createClient()
    supabase
      .from('site_surveys')
      .select('*')
      .eq('id', surveyId)
      .single()
      .then(async ({ data }) => {
        if (cancelled) return
        if (data) {
          setSurvey(data as SiteSurvey)
          // Resolve signed URLs for the photos so the gallery actually
          // renders. Photos in modern surveys live in R2 behind the
          // r2:<key> path scheme; legacy ones are Supabase Storage.
          const photos = ((data.photo_metadata as SurveyPhotoMetadata[] | null) || [])
            .filter((p) => p.path)
            .map((p) => p.path as string)
          if (photos.length > 0) {
            const urls = await getSignedSurveyMediaUrls(photos)
            if (!cancelled) setPhotoUrls(urls)
          } else {
            setPhotoUrls({})
          }
        }
        if (!cancelled) setLoading(false)
      })
      .then(undefined, () => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, surveyId])

  const env = (survey?.environment_info as SurveyEnvironmentInfo | null) ?? null
  // DB column is typed as SurveyHazardAssessments but the survey-mapper
  // actually persists the store-side HazardsData shape (areas[]). Cast
  // through unknown so we read the real shape.
  const hazards = (survey?.hazard_assessments as unknown as HazardsData | null) ?? null
  const photos = ((survey?.photo_metadata as SurveyPhotoMetadata[] | null) || []).filter(
    (p) => p.mediaType !== 'video',
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            Source Survey
            {survey && (
              <>
                <Badge variant="outline" className="capitalize">
                  {survey.status.replace('_', ' ')}
                </Badge>
                {survey.hazard_type && (
                  <Badge variant="outline" className="capitalize">
                    {survey.hazard_type}
                  </Badge>
                )}
              </>
            )}
          </DialogTitle>
          {survey && (
            <DialogDescription>
              {[survey.site_address, survey.site_city, survey.site_state, survey.site_zip]
                .filter(Boolean)
                .join(', ')}
              {survey.submitted_at && (
                <> · Submitted {new Date(survey.submitted_at).toLocaleDateString()}</>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && !survey && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {survey && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Property */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Property
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <DetailRow
                    label="Square Footage"
                    value={
                      survey.building_sqft ?? survey.area_sqft
                        ? `${(survey.building_sqft ?? survey.area_sqft)?.toLocaleString()} sq ft`
                        : null
                    }
                  />
                  <DetailRow label="Stories" value={survey.stories} />
                  <DetailRow label="Year Built" value={survey.year_built} />
                  <DetailRow label="Building Type" value={formatLabel(survey.building_type)} />
                  <DetailRow
                    label="Construction Type"
                    value={formatLabel(survey.construction_type)}
                  />
                  <DetailRow label="Occupancy" value={formatLabel(survey.occupancy_status)} />
                </CardContent>
              </Card>

              {/* Environment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Environment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {env ? (
                    <>
                      <DetailRow
                        label="Temperature"
                        value={env.temperature != null ? `${env.temperature}°F` : null}
                      />
                      <DetailRow
                        label="Humidity"
                        value={env.humidity != null ? `${env.humidity}%` : null}
                      />
                      <DetailRow
                        label="Moisture Issues"
                        value={env.moistureIssues?.length ? env.moistureIssues.join(', ') : 'None'}
                      />
                      <DetailRow
                        label="Structural Concerns"
                        value={
                          env.hasStructuralConcerns === true
                            ? env.structuralConcerns?.join(', ') || 'Yes'
                            : env.hasStructuralConcerns === false
                              ? 'None'
                              : null
                        }
                      />
                      <DetailRow
                        label="Utility Shutoffs"
                        value={
                          env.utilityShutoffsLocated === true
                            ? 'Located'
                            : env.utilityShutoffsLocated === false
                              ? 'Not located'
                              : null
                        }
                      />
                    </>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      No environment data recorded
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hazard Assessments — the data that drove the calculator */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Hazard Assessments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {hazards?.areas && hazards.areas.length > 0 ? (
                  hazards.areas.map((area) => (
                    <div key={area.id} className="border rounded-md p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <span className="font-medium">{area.area_name || 'Unnamed area'}</span>
                          {area.floor_level && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {area.floor_level}
                            </span>
                          )}
                        </div>
                        {area.hazards && area.hazards.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {area.hazards.map((h) => (
                              <Badge key={h.id} variant="outline" className="text-xs capitalize">
                                {h.hazard_type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {area.hazards?.map((h) => (
                        <div
                          key={h.id}
                          className="text-xs text-muted-foreground space-y-0.5 pl-2 border-l-2 border-muted"
                        >
                          {h.material_type && <div>Material: {h.material_type}</div>}
                          {h.condition && <div>Condition: {h.condition}</div>}
                          {h.quantity !== null && (
                            <div>
                              Quantity: {h.quantity}
                              {h.unit ? ` ${h.unit}` : ''}
                            </div>
                          )}
                          {h.containment_level && <div>Containment: Type {h.containment_level}</div>}
                          {h.notes && <div className="italic">{h.notes}</div>}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <>
                    <DetailRow label="Hazard Type" value={formatLabel(survey.hazard_type)} />
                    <DetailRow label="Subtype" value={formatLabel(survey.hazard_subtype)} />
                    <DetailRow
                      label="Area"
                      value={survey.area_sqft ? `${survey.area_sqft.toLocaleString()} sq ft` : null}
                    />
                    <DetailRow
                      label="Linear"
                      value={survey.linear_ft ? `${survey.linear_ft.toLocaleString()} ft` : null}
                    />
                    <DetailRow
                      label="Volume"
                      value={
                        survey.volume_cuft ? `${survey.volume_cuft.toLocaleString()} cu ft` : null
                      }
                    />
                    <DetailRow label="Material" value={survey.material_type} />
                    <DetailRow
                      label="Containment Level"
                      value={survey.containment_level ? `Type ${survey.containment_level}` : null}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Photos */}
            {photos.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Photos ({photos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {photos.map((p) => {
                      const src = p.path ? photoUrls[p.path] : p.url
                      return (
                        <div
                          key={p.id}
                          className="aspect-square rounded-md border bg-muted relative overflow-hidden"
                          title={p.caption || p.location || p.category}
                        >
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={src}
                              alt={p.caption || p.category}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          {p.category && (
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 capitalize truncate">
                              {p.category}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tech notes */}
            {survey.technician_notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Technician Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{survey.technician_notes}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/site-surveys/${survey.id}`} target="_blank">
                  Open full survey
                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
