'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { SiteSurveyService } from '@/lib/supabase/site-survey-service'
import { SiteSurvey } from '@/types/database'

export default function SiteSurveysPage() {
  const { organization } = useMultiTenantAuth()
  const [siteSurveys, setSiteSurveys] = useState<SiteSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (organization?.id) {
      loadSiteSurveys()
    }
  }, [organization?.id, loadSiteSurveys])

  const loadSiteSurveys = useCallback(async () => {
    try {
      setLoading(true)
      const data = await SiteSurveyService.getSiteSurveys(organization!.id)
      setSiteSurveys(data)
    } catch (error) {
      console.error('Error loading site surveys:', error)
    } finally {
      setLoading(false)
    }
  }, [organization])

  const filteredSiteSurveys = siteSurveys.filter(siteSurvey => {
    const matchesSearch = 
      siteSurvey.job_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      siteSurvey.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      siteSurvey.site_address.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || siteSurvey.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Site Surveys</h1>
            <p className="text-gray-600">Manage your field site surveys</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Surveys</h1>
          <p className="text-gray-600">Manage your field site surveys</p>
        </div>
        
        <Link href="/site-surveys/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Site Survey
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search site surveys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="estimated">Estimated</option>
          <option value="quoted">Quoted</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {siteSurveys.filter(s => s.status === 'draft').length}
            </div>
            <p className="text-sm text-gray-600">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {siteSurveys.filter(s => s.status === 'submitted').length}
            </div>
            <p className="text-sm text-gray-600">Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {siteSurveys.filter(s => s.status === 'estimated').length}
            </div>
            <p className="text-sm text-gray-600">Estimated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {siteSurveys.filter(s => s.status === 'scheduled').length}
            </div>
            <p className="text-sm text-gray-600">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Site Surveys List */}
      {filteredSiteSurveys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No site surveys found' : 'No site surveys yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first field site survey'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link href="/site-surveys/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Site Survey
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSiteSurveys.map((siteSurvey) => (
            <Link key={siteSurvey.id} href={`/site-surveys/${siteSurvey.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base line-clamp-1">
                        {siteSurvey.job_name}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {siteSurvey.customer_name}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(siteSurvey.status)}`}>
                        {siteSurvey.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHazardTypeColor(siteSurvey.hazard_type)}`}>
                        {siteSurvey.hazard_type}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {siteSurvey.site_address}, {siteSurvey.site_city}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>
                        {new Date(siteSurvey.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {siteSurvey.area_sqft && (
                      <div className="text-xs text-gray-500">
                        {siteSurvey.area_sqft.toLocaleString()} sq ft
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}