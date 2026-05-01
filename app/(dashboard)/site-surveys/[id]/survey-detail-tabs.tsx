'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building, AlertTriangle, Camera, FileText, Truck } from 'lucide-react'
import { PropertySection } from './sections/property-section'
import { AccessSection } from './sections/access-section'
import { HazardsSection } from './sections/hazards-section'
import { MediaSection } from './sections/media-section'
import { NotesSection } from './sections/notes-section'
import { isPhotoCold, canViewColdPhotos } from '@/lib/services/photo-cool-down'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import type { SiteSurvey, SurveyHazardAssessments, SurveyPhotoMetadata } from '@/types/database'

interface SurveyDetailTabsProps {
  survey: SiteSurvey & {
    customer?: {
      id: string
      company_name: string | null
      name: string
      email: string | null
      phone: string | null
    } | null
    technician?: {
      id: string
      first_name: string | null
      last_name: string | null
      email: string
    } | null
  }
  onSurveyChange: () => void
}

export function SurveyDetailTabs({ survey, onSurveyChange }: SurveyDetailTabsProps) {
  const { profile } = useMultiTenantAuth()
  const hazardAssessments = survey.hazard_assessments as SurveyHazardAssessments | null
  const photoMetadata = survey.photo_metadata as SurveyPhotoMetadata[] | null
  const hazardCount = hazardAssessments?.types?.length || 0
  // Tab badge counts what the viewer can actually see — non-admins
  // exclude photos past the cool-down window since the gallery filters
  // them out, and a tab count that doesn't match the rendered grid is
  // worse than no count at all.
  const visibleMedia = canViewColdPhotos(profile?.role)
    ? photoMetadata
    : photoMetadata?.filter((m) => !isPhotoCold(m.timestamp))
  const mediaCount = visibleMedia?.length || 0

  return (
    <Tabs defaultValue="property" className="space-y-4">
      <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
        <TabsTrigger value="property" className="gap-2">
          <Building className="h-4 w-4" />
          <span className="hidden sm:inline">Property</span>
        </TabsTrigger>
        <TabsTrigger value="access" className="gap-2">
          <Truck className="h-4 w-4" />
          <span className="hidden sm:inline">Access</span>
        </TabsTrigger>
        <TabsTrigger value="hazards" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Hazards</span>
          {hazardCount > 0 && (
            <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
              {hazardCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="media" className="gap-2">
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Media</span>
          {mediaCount > 0 && (
            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {mediaCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Notes</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="property">
        <PropertySection survey={survey} />
      </TabsContent>

      <TabsContent value="access">
        <AccessSection survey={survey} />
      </TabsContent>

      <TabsContent value="hazards">
        <HazardsSection hazardAssessments={hazardAssessments} hazardType={survey.hazard_type} />
      </TabsContent>

      <TabsContent value="media">
        <MediaSection
          surveyId={survey.id}
          media={photoMetadata}
          onChange={onSurveyChange}
        />
      </TabsContent>

      <TabsContent value="notes">
        <NotesSection survey={survey} />
      </TabsContent>
    </Tabs>
  )
}
