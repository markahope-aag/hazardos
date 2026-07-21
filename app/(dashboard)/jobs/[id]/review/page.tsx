import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  Clock,
  Package,
  Camera,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  FileText,
  User,
} from 'lucide-react'
import { CompletionReviewActions } from './review-actions'
import { cn } from '@/lib/utils'
import { VARIANCE_THRESHOLD_PCT } from '@/lib/utils/variance'
import { getCurrentProfile } from '@/lib/auth/server-auth'
import { ROLES } from '@/lib/auth/roles'
import {
  completionStatusConfig,
} from '@/types/job-completion'

export default async function JobReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch job with completion data
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers!customer_id(id, name, company_name, email, phone),
      completion:job_completions!job_completions_job_id_fkey(
        *,
        submitter:profiles!job_completions_submitted_by_fkey(id, full_name),
        reviewer:profiles!job_completions_reviewed_by_fkey(id, full_name)
      )
    `)
    .eq('id', id)
    .single()

  if (jobError || !job) {
    notFound()
  }

  // Transform nested data
  const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
  const completion = Array.isArray(job.completion) ? job.completion[0] : job.completion

  if (!completion) {
    notFound()
  }

  // The technician who submitted lands here too now (right after
  // submitting, so they see the variance analysis immediately instead of
  // just a redirect back to the job) — only office-admin roles get the
  // approve/reject actions; everyone else sees a read-only "awaiting
  // review" notice instead.
  const profile = await getCurrentProfile()
  const canReview = ROLES.TENANT_ADMIN.includes(profile?.role ?? '')

  // Fetch related data
  const [timeEntriesRes, materialUsageRes, photosRes, checklistRes] = await Promise.all([
    supabase
      .from('job_time_entries')
      .select('*, profile:profiles!job_time_entries_profile_id_fkey(id, full_name)')
      .eq('job_id', id)
      .order('work_date', { ascending: false }),
    supabase
      .from('job_material_usage')
      .select('id, job_id, material_name, quantity_estimated, quantity_used, unit, unit_cost, total_cost, variance_percent, notes, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('job_completion_photos')
      .select('*, uploader:profiles!job_completion_photos_uploaded_by_fkey(id, full_name)')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('job_completion_checklists')
      .select('id, job_id, category, item_name, is_required, is_completed, completed_by, completed_at, notes, sort_order, created_at')
      .eq('job_id', id)
      .order('category')
      .order('sort_order'),
  ])

  const timeEntries = (timeEntriesRes.data || []).map(e => ({
    ...e,
    profile: Array.isArray(e.profile) ? e.profile[0] : e.profile,
  }))

  const materialUsage = materialUsageRes.data || []
  const photos = (photosRes.data || []).map(p => ({
    ...p,
    uploader: Array.isArray(p.uploader) ? p.uploader[0] : p.uploader,
  }))
  const checklist = checklistRes.data || []

  // Calculate totals
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0)
  const totalMaterialCost = materialUsage.reduce((sum, m) => sum + (m.total_cost || 0), 0)
  const completedChecklist = checklist.filter(c => c.is_completed).length
  const requiredChecklist = checklist.filter(c => c.is_required)
  const completedRequired = requiredChecklist.filter(c => c.is_completed).length

  // Group checklist by category
  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof checklist>)

  // Variance colors
  const getVarianceColor = (percent: number | null) => {
    if (percent === null) return 'text-gray-500'
    if (percent > VARIANCE_THRESHOLD_PCT) return 'text-red-600'
    if (percent < -VARIANCE_THRESHOLD_PCT) return 'text-green-600'
    return 'text-gray-600'
  }

  // Like-for-like material comparison (J15): the original card paired the whole
  // job estimate total against material-only actual cost, which is misleading.
  // Estimated materials = sum of (estimated qty x unit cost) across the logged
  // material lines; actual = sum of their total_cost (= totalMaterialCost). Both
  // come from job_material_usage (loaded above), so the pairing is true
  // like-for-like and the percent below always agrees with the two cells.
  const estMaterialFromLines = materialUsage.reduce(
    (sum, m) => sum + (m.quantity_estimated || 0) * (m.unit_cost || 0),
    0,
  )
  const estMaterialCost =
    typeof completion.estimated_material_cost === 'number' && completion.estimated_material_cost > 0
      ? completion.estimated_material_cost
      : estMaterialFromLines
  const materialVariancePercent =
    estMaterialCost > 0
      ? ((totalMaterialCost - estMaterialCost) / estMaterialCost) * 100
      : null

  // Explicit over/under-budget text (J16/J17) — color alone isn't accessible
  // and QA couldn't tell overrun from under-budget. Threshold matches the
  // color bands above (±10%).
  const getVarianceLabel = (
    percent: number | null | undefined,
    overText: string,
    underText: string,
  ) => {
    if (percent === null || percent === undefined) return null
    if (percent > VARIANCE_THRESHOLD_PCT) return { text: overText, className: 'text-red-600' }
    if (percent < -VARIANCE_THRESHOLD_PCT) return { text: underText, className: 'text-green-600' }
    return { text: 'On target', className: 'text-gray-500' }
  }
  const hoursVarianceLabel = getVarianceLabel(completion.hours_variance_percent, 'Overrun', 'Under est.')
  const materialVarianceLabel = getVarianceLabel(materialVariancePercent, 'Over budget', 'Under budget')

  const statusConfig = completionStatusConfig[completion.status as keyof typeof completionStatusConfig]

  return (
    <div className="container py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/jobs/${id}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Job
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{job.job_number} Review</h1>
            <p className="text-muted-foreground">{job.name || customer?.company_name || customer?.name}</p>
          </div>
        </div>
        <Badge className={cn(statusConfig?.bgColor, statusConfig?.color)}>
          {statusConfig?.label || completion.status}
        </Badge>
      </div>

      {/* Submission Info */}
      {completion.submitted_at && (
        <Card className="mb-6">
          <CardContent className="py-4 flex items-center gap-4">
            <User className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">
                Submitted by <span className="font-medium">{completion.submitter?.full_name || 'Unknown'}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(completion.submitted_at).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variance Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Variance Summary
          </CardTitle>
          <CardDescription>Estimated vs. Actual comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Est. Hours</p>
              <p className="text-2xl font-bold">{completion.estimated_hours?.toFixed(1) || '—'}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Actual Hours</p>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
              {completion.hours_variance_percent !== null && (
                <p className={cn('text-sm', getVarianceColor(completion.hours_variance_percent))}>
                  {completion.hours_variance_percent > 0 ? '+' : ''}
                  {completion.hours_variance_percent?.toFixed(1)}%
                </p>
              )}
              {hoursVarianceLabel && (
                <p className={cn('text-xs font-medium mt-0.5', hoursVarianceLabel.className)}>
                  {hoursVarianceLabel.text}
                </p>
              )}
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Est. Materials</p>
              <p className="text-2xl font-bold">
                {estMaterialCost > 0 ? `$${estMaterialCost.toLocaleString()}` : '—'}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Actual Materials</p>
              <p className="text-2xl font-bold">${totalMaterialCost.toLocaleString()}</p>
              {materialVariancePercent !== null && (
                <p className={cn('text-sm', getVarianceColor(materialVariancePercent))}>
                  {materialVariancePercent > 0 ? '+' : ''}
                  {materialVariancePercent.toFixed(1)}%
                </p>
              )}
              {materialVarianceLabel && (
                <p className={cn('text-xs font-medium mt-0.5', materialVarianceLabel.className)}>
                  {materialVarianceLabel.text}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time Entries ({timeEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No time entries recorded</p>
          ) : (
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{entry.profile?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.work_date} - {entry.work_type}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{entry.hours} hrs</p>
                    {entry.hourly_rate && (
                      <p className="text-sm text-muted-foreground">
                        @ ${entry.hourly_rate}/hr
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between pt-2">
                <span className="font-medium">Total</span>
                <span className="font-bold">{totalHours.toFixed(2)} hours</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Material Usage */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materials Used ({materialUsage.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materialUsage.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No materials recorded</p>
          ) : (
            <div className="space-y-2">
              {materialUsage.map((material) => (
                <div key={material.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{material.material_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {material.quantity_used} {material.unit || 'units'}
                      {material.quantity_estimated && (
                        <span> (est: {material.quantity_estimated})</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {material.total_cost && (
                      <p className="font-medium">${material.total_cost.toFixed(2)}</p>
                    )}
                    {material.variance_percent !== null && (
                      <Badge
                        variant={Math.abs(material.variance_percent) > VARIANCE_THRESHOLD_PCT ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {material.variance_percent > 0 ? '+' : ''}{material.variance_percent.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between pt-2">
                <span className="font-medium">Total Material Cost</span>
                <span className="font-bold">${totalMaterialCost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No photos captured</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="relative h-32">
                    <Image
                      src={photo.photo_url}
                      alt={photo.caption || 'Job photo'}
                      fill
                      className="object-cover rounded-lg"
                      unoptimized
                    />
                    <Badge className="absolute top-2 left-2 text-xs z-10">
                      {photo.photo_type}
                    </Badge>
                  </div>
                  {photo.caption && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Checklist ({completedChecklist}/{checklist.length})
          </CardTitle>
          {completedRequired < requiredChecklist.length && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                {requiredChecklist.length - completedRequired} required items incomplete
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {Object.entries(groupedChecklist).map(([category, items]) => (
            <div key={category} className="mb-4 last:mb-0">
              <h4 className="font-medium capitalize mb-2">{category}</h4>
              <div className="space-y-1">
                {(items as typeof checklist).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 text-sm py-1',
                      item.is_completed ? 'text-green-700' : 'text-muted-foreground'
                    )}
                  >
                    {item.is_completed ? (
                      <CheckSquare className="w-4 h-4 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border rounded" />
                    )}
                    <span className={item.is_completed ? 'line-through' : ''}>
                      {item.item_name}
                    </span>
                    {item.is_required && !item.is_completed && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Field Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Field Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {completion.field_notes && (
            <div>
              <h4 className="font-medium mb-1">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {completion.field_notes}
              </p>
            </div>
          )}

          {completion.issues_encountered && (
            <div>
              <h4 className="font-medium mb-1 text-amber-600">Issues Encountered</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {completion.issues_encountered}
              </p>
            </div>
          )}

          {completion.recommendations && (
            <div>
              <h4 className="font-medium mb-1">Recommendations</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {completion.recommendations}
              </p>
            </div>
          )}

          {!completion.field_notes && !completion.issues_encountered && !completion.recommendations && (
            <p className="text-muted-foreground text-center py-4">No field notes provided</p>
          )}
        </CardContent>
      </Card>

      {/* Review Actions */}
      {completion.status === 'submitted' && (
        canReview ? (
          <CompletionReviewActions jobId={id} />
        ) : (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4 flex items-center gap-3">
              <User className="w-5 h-5 text-blue-700 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Submitted — awaiting office review. You&apos;ll be notified once it&apos;s approved or sent back.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* Previous Review Info */}
      {completion.status === 'rejected' && completion.rejection_reason && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{completion.rejection_reason}</p>
            {completion.review_notes && (
              <p className="text-sm text-red-600 mt-2">{completion.review_notes}</p>
            )}
            <p className="text-xs text-red-500 mt-2">
              Rejected by {completion.reviewer?.full_name || 'Unknown'} on{' '}
              {new Date(completion.reviewed_at!).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {completion.status === 'approved' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            {completion.review_notes && (
              <p className="text-green-700">{completion.review_notes}</p>
            )}
            <p className="text-xs text-green-600 mt-2">
              Approved by {completion.reviewer?.full_name || 'Unknown'} on{' '}
              {new Date(completion.reviewed_at!).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
