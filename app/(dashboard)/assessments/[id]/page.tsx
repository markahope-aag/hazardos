'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, MapPin, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { SimpleAssessmentForm } from '@/components/assessments/simple-assessment-form'
import { DatabaseService } from '@/lib/supabase/database'
import { Assessment } from '@/types/database'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

export default function AssessmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const assessmentId = params.id as string

  useEffect(() => {
    if (assessmentId && organization?.id) {
      loadAssessment()
    }
  }, [assessmentId, organization?.id])

  const loadAssessment = async () => {
    try {
      setLoading(true)
      const data = await DatabaseService.getAssessment(assessmentId)
      if (data) {
        setAssessment(data)
        // If it's a draft, start in edit mode
        if (data.status === 'draft') {
          setIsEditing(true)
        }
      } else {
        toast({
          title: 'Assessment not found',
          description: 'The requested assessment could not be found.',
          variant: 'destructive',
        })
        router.push('/assessments')
      }
    } catch (error) {
      console.error('Error loading assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assessment.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!assessment) return
    
    if (confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      try {
        await DatabaseService.deleteAssessment(assessment.id)
        toast({
          title: 'Assessment deleted',
          description: 'The assessment has been deleted successfully.',
        })
        router.push('/assessments')
      } catch (error) {
        console.error('Error deleting assessment:', error)
        toast({
          title: 'Error',
          description: 'Failed to delete assessment.',
          variant: 'destructive',
        })
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'estimated': return 'bg-yellow-100 text-yellow-800'
      case 'quoted': return 'bg-purple-100 text-purple-800'
      case 'scheduled': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHazardTypeColor = (hazardType: string) => {
    switch (hazardType) {
      case 'asbestos': return 'bg-red-100 text-red-800'
      case 'mold': return 'bg-green-100 text-green-800'
      case 'lead': return 'bg-orange-100 text-orange-800'
      case 'vermiculite': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment not found</h1>
        <p className="text-gray-600 mb-4">The requested assessment could not be found.</p>
        <Link href="/assessments">
          <Button>Back to Assessments</Button>
        </Link>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Assessment</h1>
            <p className="text-gray-600">{assessment.job_name}</p>
          </div>
        </div>

        <SimpleAssessmentForm 
          assessmentId={assessment.id}
          initialData={assessment}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/assessments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{assessment.job_name}</h1>
            <p className="text-gray-600">{assessment.customer_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status and Type */}
      <div className="flex gap-2 mb-6">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(assessment.status)}`}>
          {assessment.status}
        </span>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getHazardTypeColor(assessment.hazard_type)}`}>
          {assessment.hazard_type}
        </span>
        {assessment.containment_level && (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
            Level {assessment.containment_level}
          </span>
        )}
      </div>

      {/* Assessment Details */}
      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Customer</label>
                <p className="text-gray-900">{assessment.customer_name}</p>
              </div>
              {assessment.customer_email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{assessment.customer_email}</p>
                </div>
              )}
              {assessment.customer_phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{assessment.customer_phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{new Date(assessment.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site Information */}
        <Card>
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-900">{assessment.site_address}</p>
                <p className="text-gray-600">
                  {assessment.site_city}, {assessment.site_state} {assessment.site_zip}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hazard Information */}
        <Card>
          <CardHeader>
            <CardTitle>Hazard Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Hazard Type</label>
                <p className="text-gray-900 capitalize">{assessment.hazard_type}</p>
              </div>
              {assessment.hazard_subtype && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Material/Subtype</label>
                  <p className="text-gray-900">{assessment.hazard_subtype}</p>
                </div>
              )}
              {assessment.containment_level && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Containment Level</label>
                  <p className="text-gray-900">Level {assessment.containment_level}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Measurements */}
        {(assessment.area_sqft || assessment.linear_ft || assessment.volume_cuft) && (
          <Card>
            <CardHeader>
              <CardTitle>Measurements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {assessment.area_sqft && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Area</label>
                    <p className="text-gray-900">{assessment.area_sqft.toLocaleString()} sq ft</p>
                  </div>
                )}
                {assessment.linear_ft && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Linear</label>
                    <p className="text-gray-900">{assessment.linear_ft.toLocaleString()} ft</p>
                  </div>
                )}
                {assessment.volume_cuft && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Volume</label>
                    <p className="text-gray-900">{assessment.volume_cuft.toLocaleString()} cu ft</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Site Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Site Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Occupied</label>
                <p className="text-gray-900">{assessment.occupied ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Clearance Required</label>
                <p className="text-gray-900">{assessment.clearance_required ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            {assessment.access_issues && assessment.access_issues.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Access Issues</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {assessment.access_issues.map((issue, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {assessment.special_conditions && (
              <div>
                <label className="text-sm font-medium text-gray-500">Special Conditions</label>
                <p className="text-gray-900">{assessment.special_conditions}</p>
              </div>
            )}

            {assessment.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="text-gray-900 whitespace-pre-wrap">{assessment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}