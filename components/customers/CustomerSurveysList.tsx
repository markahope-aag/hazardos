import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, MapPin, Calendar, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SiteSurvey } from '@/types/database'

interface CustomerSurveysListProps {
  customerId: string
}

export default function CustomerSurveysList({ customerId }: CustomerSurveysListProps) {
  const [surveys, setSurveys] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('site_surveys')
          .select(`
            id,
            job_name,
            site_address,
            status,
            created_at,
            scheduled_date,
            appointment_status
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setSurveys(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load surveys')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSurveys()
  }, [customerId])

  const handleCreateSurvey = () => {
    router.push(`/site-surveys/new?customer_id=${customerId}`)
  }

  const handleViewSurvey = (surveyId: string) => {
    router.push(`/site-surveys/${surveyId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAppointmentStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    switch (status) {
      case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'no_show': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Site Surveys
          {!isLoading && (
            <span className="text-sm font-normal text-gray-500">
              ({surveys.length})
            </span>
          )}
        </CardTitle>
        <Button size="sm" onClick={handleCreateSurvey}>
          <Plus className="mr-2 h-4 w-4" />
          New Survey
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="text-red-600 mb-2">Error loading surveys</div>
            <div className="text-sm text-gray-500">{error}</div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys yet</h3>
            <p className="text-gray-500 mb-4">
              Create the first site survey for this customer
            </p>
            <Button onClick={handleCreateSurvey}>
              <Plus className="mr-2 h-4 w-4" />
              Create Survey
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {survey.job_name || 'Untitled Survey'}
                      </h4>
                      <Badge className={getStatusColor(survey.status)}>
                        {survey.status}
                      </Badge>
                      {survey.appointment_status && (
                        <Badge className={getAppointmentStatusColor(survey.appointment_status)}>
                          {survey.appointment_status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    
                    {survey.site_address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <MapPin className="h-3 w-3" />
                        {survey.site_address}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {format(new Date(survey.created_at), 'MMM d, yyyy')}
                      </div>
                      {survey.scheduled_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Scheduled {format(new Date(survey.scheduled_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewSurvey(survey.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}