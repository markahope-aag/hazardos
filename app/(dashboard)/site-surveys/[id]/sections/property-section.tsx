'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, MapPin, Calendar, User, Phone, Mail } from 'lucide-react'
import type { SiteSurvey, SurveyEnvironmentInfo } from '@/types/database'

interface PropertySectionProps {
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
}

export function PropertySection({ survey }: PropertySectionProps) {
  const environmentInfo = survey.environment_info as SurveyEnvironmentInfo | null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="font-medium">{survey.site_address}</p>
              <p className="text-sm text-muted-foreground">
                {survey.site_city}, {survey.site_state} {survey.site_zip}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {survey.building_type && (
              <div>
                <label className="text-sm text-muted-foreground">Building Type</label>
                <p className="font-medium capitalize">{survey.building_type.replace('_', ' ')}</p>
              </div>
            )}
            {survey.year_built && (
              <div>
                <label className="text-sm text-muted-foreground">Year Built</label>
                <p className="font-medium">{survey.year_built}</p>
              </div>
            )}
            {survey.building_sqft && (
              <div>
                <label className="text-sm text-muted-foreground">Square Footage</label>
                <p className="font-medium">{survey.building_sqft.toLocaleString()} sq ft</p>
              </div>
            )}
            {survey.stories && (
              <div>
                <label className="text-sm text-muted-foreground">Stories</label>
                <p className="font-medium">{survey.stories}</p>
              </div>
            )}
            {survey.construction_type && (
              <div>
                <label className="text-sm text-muted-foreground">Construction</label>
                <p className="font-medium capitalize">{survey.construction_type.replace('_', ' ')}</p>
              </div>
            )}
            {survey.occupancy_status && (
              <div>
                <label className="text-sm text-muted-foreground">Occupancy</label>
                <p className="font-medium capitalize">{survey.occupancy_status}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer/Owner Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {survey.customer ? (
            <>
              <div>
                <label className="text-sm text-muted-foreground">Customer</label>
                <p className="font-medium">
                  {survey.customer.company_name || survey.customer.name}
                </p>
              </div>
              {survey.customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${survey.customer.email}`} className="text-primary hover:underline">
                    {survey.customer.email}
                  </a>
                </div>
              )}
              {survey.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${survey.customer.phone}`} className="text-primary hover:underline">
                    {survey.customer.phone}
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-muted-foreground">Customer Name</label>
                <p className="font-medium">{survey.customer_name}</p>
              </div>
              {survey.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${survey.customer_email}`} className="text-primary hover:underline">
                    {survey.customer_email}
                  </a>
                </div>
              )}
              {survey.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${survey.customer_phone}`} className="text-primary hover:underline">
                    {survey.customer_phone}
                  </a>
                </div>
              )}
            </>
          )}

          {/* Owner Info (if different) */}
          {survey.owner_name && survey.owner_name !== survey.customer_name && (
            <div className="pt-4 border-t">
              <div>
                <label className="text-sm text-muted-foreground">Property Owner</label>
                <p className="font-medium">{survey.owner_name}</p>
              </div>
              {survey.owner_email && (
                <div className="flex items-center gap-2 mt-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{survey.owner_email}</span>
                </div>
              )}
              {survey.owner_phone && (
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{survey.owner_phone}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Conditions */}
      {environmentInfo && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Environment Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {environmentInfo.temperature !== null && (
                <div>
                  <label className="text-sm text-muted-foreground">Temperature</label>
                  <p className="font-medium">{environmentInfo.temperature}°F</p>
                </div>
              )}
              {environmentInfo.humidity !== null && (
                <div>
                  <label className="text-sm text-muted-foreground">Humidity</label>
                  <p className="font-medium">{environmentInfo.humidity}%</p>
                </div>
              )}
              {environmentInfo.hasStructuralConcerns !== null && (
                <div>
                  <label className="text-sm text-muted-foreground">Structural Concerns</label>
                  <p className="font-medium">{environmentInfo.hasStructuralConcerns ? 'Yes' : 'No'}</p>
                </div>
              )}
              {environmentInfo.utilityShutoffsLocated !== null && (
                <div>
                  <label className="text-sm text-muted-foreground">Utility Shutoffs Located</label>
                  <p className="font-medium">{environmentInfo.utilityShutoffsLocated ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>

            {environmentInfo.moistureIssues && environmentInfo.moistureIssues.length > 0 && (
              <div className="mt-4">
                <label className="text-sm text-muted-foreground">Moisture Issues</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {environmentInfo.moistureIssues.map((issue, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      {issue.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {environmentInfo.structuralConcerns && environmentInfo.structuralConcerns.length > 0 && (
              <div className="mt-4">
                <label className="text-sm text-muted-foreground">Structural Concerns</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {environmentInfo.structuralConcerns.map((concern, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                      {concern.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {environmentInfo.structuralNotes && (
              <div className="mt-4">
                <label className="text-sm text-muted-foreground">Structural Notes</label>
                <p className="text-sm mt-1">{environmentInfo.structuralNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scheduled Info */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Survey Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {survey.scheduled_date && (
              <div>
                <label className="text-sm text-muted-foreground">Scheduled Date</label>
                <p className="font-medium">{new Date(survey.scheduled_date).toLocaleDateString()}</p>
              </div>
            )}
            {survey.scheduled_time_start && (
              <div>
                <label className="text-sm text-muted-foreground">Start Time</label>
                <p className="font-medium">{survey.scheduled_time_start}</p>
              </div>
            )}
            {survey.scheduled_time_end && (
              <div>
                <label className="text-sm text-muted-foreground">End Time</label>
                <p className="font-medium">{survey.scheduled_time_end}</p>
              </div>
            )}
            {survey.technician && (
              <div>
                <label className="text-sm text-muted-foreground">Assigned Technician</label>
                <p className="font-medium">
                  {survey.technician.first_name} {survey.technician.last_name}
                </p>
              </div>
            )}
            {survey.started_at && (
              <div>
                <label className="text-sm text-muted-foreground">Started At</label>
                <p className="font-medium">{new Date(survey.started_at).toLocaleString()}</p>
              </div>
            )}
            {survey.submitted_at && (
              <div>
                <label className="text-sm text-muted-foreground">Submitted At</label>
                <p className="font-medium">{new Date(survey.submitted_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
