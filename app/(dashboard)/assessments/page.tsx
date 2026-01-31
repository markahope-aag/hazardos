'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, MapPin, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { DatabaseService } from '@/lib/supabase/database'
import { Assessment } from '@/types/database'

export default function AssessmentsPage() {
  const { user, profile, organization } = useMultiTenantAuth()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (organization?.id) {
      loadAssessments()
    }
  }, [organization?.id])

  const loadAssessments = async () => {
    try {
      setLoading(true)
      const data = await DatabaseService.getAssessments(organization!.id)
      setAssessments(data)
    } catch (error) {
      console.error('Error loading assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = 
      assessment.job_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.site_address.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter

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
            <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
            <p className="text-gray-600">Manage your field assessments</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-gray-600">Manage your field assessments</p>
        </div>
        
        <Link href="/assessments/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search assessments..."
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
              {assessments.filter(a => a.status === 'draft').length}
            </div>
            <p className="text-sm text-gray-600">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {assessments.filter(a => a.status === 'submitted').length}
            </div>
            <p className="text-sm text-gray-600">Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {assessments.filter(a => a.status === 'estimated').length}
            </div>
            <p className="text-sm text-gray-600">Estimated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {assessments.filter(a => a.status === 'scheduled').length}
            </div>
            <p className="text-sm text-gray-600">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessments List */}
      {filteredAssessments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No assessments found' : 'No assessments yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first field assessment'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link href="/assessments/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assessment
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssessments.map((assessment) => (
            <Link key={assessment.id} href={`/assessments/${assessment.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base line-clamp-1">
                        {assessment.job_name}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {assessment.customer_name}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assessment.status)}`}>
                        {assessment.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHazardTypeColor(assessment.hazard_type)}`}>
                        {assessment.hazard_type}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {assessment.site_address}, {assessment.site_city}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {assessment.area_sqft && (
                      <div className="text-xs text-gray-500">
                        {assessment.area_sqft.toLocaleString()} sq ft
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