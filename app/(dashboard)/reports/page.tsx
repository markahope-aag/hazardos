import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  FileSpreadsheet,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { reportTypeConfig } from '@/types/reporting'
import type { ReportType } from '@/types/reporting'

const reportIcons: Record<ReportType, React.ElementType> = {
  sales: TrendingUp,
  jobs: DollarSign,
  leads: Users,
  revenue: BarChart3,
  custom: FileSpreadsheet,
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const reports = await ReportingService.listReports()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Analyze business performance and export data
          </p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Link>
        </Button>
      </div>

      {/* Quick Reports */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(['sales', 'jobs', 'leads', 'revenue'] as ReportType[]).map(type => {
          const config = reportTypeConfig[type]
          const Icon = reportIcons[type]

          return (
            <Card key={type} className="hover:bg-muted/50 transition-colors">
              <Link href={`/reports/${type}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>
                </CardContent>
              </Link>
            </Card>
          )
        })}
      </div>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>
            Your saved and shared reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No saved reports yet</p>
              <p className="text-sm text-muted-foreground">
                Run a report and save it for quick access
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {reports.map(report => {
                const Icon = reportIcons[report.report_type as ReportType] || FileSpreadsheet

                return (
                  <Link
                    key={report.id}
                    href={`/reports/saved/${report.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {reportTypeConfig[report.report_type as ReportType]?.label || report.report_type}
                          {report.is_shared && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Shared
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(report.updated_at), 'MMM d, yyyy')}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
