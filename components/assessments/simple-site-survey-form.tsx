'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, MapPin, Camera, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { MediaUpload } from './media-upload'
import { SiteSurveyService } from '@/lib/supabase/site-survey-service'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import type { SiteSurveyStatus, HazardType } from '@/types/database'

interface SiteSurveyFormProps {
  siteSurveyId?: string
  initialData?: any
}

export function SimpleSiteSurveyForm({ siteSurveyId, initialData }: SiteSurveyFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile: _profile, organization } = useMultiTenantAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraft, setIsDraft] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<any[]>([])

  // Site Survey form state
  const [formData, setFormData] = useState({
    job_name: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    site_address: '',
    site_city: '',
    site_state: '',
    site_zip: '',
    hazard_type: 'asbestos' as HazardType,
    hazard_subtype: '',
    containment_level: 1,
    area_sqft: '',
    linear_ft: '',
    volume_cuft: '',
    material_type: '',
    occupied: false,
    clearance_required: false,
    clearance_lab: '',
    regulatory_notifications_needed: false,
    access_issues: [] as string[],
    special_conditions: '',
    notes: '',
    ...initialData
  })

  // Get GPS location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log('Location access denied or unavailable:', error)
        }
      )
    }
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const _handleAccessIssueChange = (_issue: string, _checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      access_issues: checked 
        ? [...prev.access_issues, issue]
        : prev.access_issues.filter((i: string) => i !== issue)
    }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!organization?.id || !user?.id) {
      toast({
        title: 'Error',
        description: 'Missing organization or user information',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const siteSurveyData = {
        ...formData,
        organization_id: organization.id,
        estimator_id: user.id,
        status: (isDraft ? 'draft' : 'submitted') as SiteSurveyStatus,
        site_location: location ? { lat: location.lat, lng: location.lng } : null,
        area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
        linear_ft: formData.linear_ft ? parseFloat(formData.linear_ft) : null,
        volume_cuft: formData.volume_cuft ? parseFloat(formData.volume_cuft) : null,
      }

      let result
      let currentSiteSurveyId = siteSurveyId

      // Create or update site survey first
      if (siteSurveyId) {
        result = await SiteSurveyService.updateSiteSurvey(siteSurveyId, siteSurveyData)
      } else {
        result = await SiteSurveyService.createSiteSurvey(siteSurveyData)
        currentSiteSurveyId = result.id
        // Update URL without page reload
        window.history.replaceState(null, '', `/site-surveys/${result.id}`)
      }

      // Upload media files if any
      if (mediaFiles.length > 0 && currentSiteSurveyId) {
        const uploadPromises = mediaFiles.map(async (mediaFile) => {
          try {
            return await SiteSurveyService.uploadMediaFile(
              mediaFile.file,
              currentSiteSurveyId!,
              organization.id
            )
          } catch (error) {
            console.error('Failed to upload media file:', mediaFile.file.name, error)
            toast({
              title: 'Media upload failed',
              description: `Failed to upload ${mediaFile.file.name}`,
              variant: 'destructive',
            })
            return null
          }
        })

        const uploadResults = await Promise.all(uploadPromises)
        const successfulUploads = uploadResults.filter(result => result !== null)
        
        if (successfulUploads.length > 0) {
          toast({
            title: 'Media uploaded',
            description: `Successfully uploaded ${successfulUploads.length} file(s)`,
          })
        }
      }

      toast({
        title: isDraft ? 'Draft saved' : 'Site Survey submitted',
        description: isDraft 
          ? 'Your site survey has been saved as a draft'
          : 'Your site survey has been submitted successfully',
      })

      if (!isDraft) {
        router.push('/site-surveys')
      } else {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Error saving assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to save site survey. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = () => {
    setIsDraft(true)
    const form = document.getElementById('site-survey-form') as HTMLFormElement
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }
  }

  const handleSubmitFinal = () => {
    setIsDraft(false)
    const form = document.getElementById('site-survey-form') as HTMLFormElement
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }
  }

  const _accessIssueOptions = [
    'Limited parking',
    'Narrow access',
    'Stairs only',
    'Elevator required',
    'Security clearance needed',
    'After hours access only',
    'Other'
  ]

  return (
    <form id="site-survey-form" onSubmit={onSubmit} className="space-y-6">
      {/* Status Bar */}
      <div className="bg-white border-b sticky top-0 z-10 p-4 -mx-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {lastSaved ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-600">Ready to save</span>
            )}
          </div>
          
          {location && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-green-500" />
              <span>GPS</span>
            </div>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Job and customer details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="job_name">Job Name *</Label>
            <Input
              id="job_name"
              value={formData.job_name}
              onChange={(e) => handleInputChange('job_name', e.target.value)}
              placeholder="e.g., Main Street Office Building"
              className="text-base"
              required
            />
          </div>

          <div>
            <Label htmlFor="customer_name">Customer Name *</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              placeholder="e.g., ABC Property Management"
              className="text-base"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_email">Customer Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => handleInputChange('customer_email', e.target.value)}
                placeholder="contact@company.com"
                className="text-base"
              />
            </div>

            <div>
              <Label htmlFor="customer_phone">Customer Phone</Label>
              <Input
                id="customer_phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Information */}
      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
          <CardDescription>Property location details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="site_address">Site Address *</Label>
            <Input
              id="site_address"
              value={formData.site_address}
              onChange={(e) => handleInputChange('site_address', e.target.value)}
              placeholder="123 Main Street"
              className="text-base"
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="site_city">City *</Label>
              <Input
                id="site_city"
                value={formData.site_city}
                onChange={(e) => handleInputChange('site_city', e.target.value)}
                placeholder="City"
                className="text-base"
                required
              />
            </div>

            <div>
              <Label htmlFor="site_state">State *</Label>
              <Input
                id="site_state"
                value={formData.site_state}
                onChange={(e) => handleInputChange('site_state', e.target.value.toUpperCase())}
                placeholder="CA"
                maxLength={2}
                className="text-base uppercase"
                required
              />
            </div>

            <div>
              <Label htmlFor="site_zip">ZIP Code *</Label>
              <Input
                id="site_zip"
                value={formData.site_zip}
                onChange={(e) => handleInputChange('site_zip', e.target.value)}
                placeholder="12345"
                className="text-base"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hazard Information */}
      <Card>
        <CardHeader>
          <CardTitle>Hazard Information</CardTitle>
          <CardDescription>Type and scope of hazardous materials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hazard_type">Hazard Type *</Label>
            <select
              id="hazard_type"
              value={formData.hazard_type}
              onChange={(e) => handleInputChange('hazard_type', e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="asbestos">Asbestos</option>
              <option value="mold">Mold</option>
              <option value="lead">Lead Paint</option>
              <option value="vermiculite">Vermiculite</option>
              <option value="other">Other</option>
            </select>
          </div>

          {formData.hazard_type === 'asbestos' && (
            <div>
              <Label htmlFor="containment_level">Containment Level</Label>
              <select
                id="containment_level"
                value={formData.containment_level}
                onChange={(e) => handleInputChange('containment_level', parseInt(e.target.value))}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={1}>Level 1 - Minor</option>
                <option value={2}>Level 2 - Small Scale</option>
                <option value={3}>Level 3 - Large Scale</option>
                <option value={4}>Level 4 - Major</option>
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="hazard_subtype">Material/Subtype</Label>
            <Input
              id="hazard_subtype"
              value={formData.hazard_subtype}
              onChange={(e) => handleInputChange('hazard_subtype', e.target.value)}
              placeholder="e.g., Pipe insulation, Floor tiles"
              className="text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Photos and Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Photos & Videos</span>
          </CardTitle>
          <CardDescription>
            Document site conditions with photos and videos for your survey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MediaUpload
            onMediaChange={setMediaFiles}
            maxFiles={20}
            maxVideoSizeMB={50}
            maxImageSizeMB={5}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t p-4 -mx-4 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting && isDraft ? 'Saving...' : 'Save Draft'}
          </Button>
          
          <Button
            type="button"
            onClick={handleSubmitFinal}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && !isDraft ? 'Submitting...' : 'Submit Site Survey'}
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Photos and videos are automatically compressed to save space
        </p>
      </div>
    </form>
  )
}