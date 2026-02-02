'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Clock,
  Package,
  Camera,
  CheckSquare,
  FileText,
  X,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Send,
} from 'lucide-react'
import type {
  JobTimeEntry,
  JobMaterialUsage,
  JobCompletionPhoto,
  JobCompletionChecklist,
  JobCompletion,
  CreateTimeEntryInput,
  CreateMaterialUsageInput,
  PhotoType,
  TimeEntryWorkType,
  GroupedChecklists,
  workTypeConfig,
  photoTypeConfig,
  checklistCategoryConfig,
} from '@/types/job-completion'

type CompletionTab = 'time' | 'materials' | 'photos' | 'checklist' | 'review'

const TABS: { value: CompletionTab; label: string; icon: React.ReactNode }[] = [
  { value: 'time', label: 'Time', icon: <Clock className="w-4 h-4" /> },
  { value: 'materials', label: 'Materials', icon: <Package className="w-4 h-4" /> },
  { value: 'photos', label: 'Photos', icon: <Camera className="w-4 h-4" /> },
  { value: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'review', label: 'Review', icon: <FileText className="w-4 h-4" /> },
]

const WORK_TYPES: { value: TimeEntryWorkType; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'travel', label: 'Travel' },
  { value: 'setup', label: 'Setup' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'supervision', label: 'Supervision' },
]

const PHOTO_TYPES: { value: PhotoType; label: string }[] = [
  { value: 'before', label: 'Before' },
  { value: 'during', label: 'During' },
  { value: 'after', label: 'After' },
  { value: 'issue', label: 'Issue' },
  { value: 'documentation', label: 'Documentation' },
]

interface CompletionData {
  timeEntries: JobTimeEntry[]
  materialUsage: JobMaterialUsage[]
  photos: JobCompletionPhoto[]
  checklist: GroupedChecklists
  completion: JobCompletion | null
  checklistProgress: { completed: number; required: number; total: number }
}

// Image compression constants
const MAX_IMAGE_WIDTH = 1920
const MAX_IMAGE_HEIGHT = 1920
const JPEG_QUALITY = 0.8
const MAX_FILE_SIZE_MB = 2

/**
 * Compress an image file using Canvas API
 * Reduces dimensions and applies JPEG compression
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Skip compression for non-image files
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const objectUrl = URL.createObjectURL(file)

    if (!ctx) {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      // Cleanup object URL after image loads
      URL.revokeObjectURL(objectUrl)

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img

      if (width > MAX_IMAGE_WIDTH) {
        height = (height * MAX_IMAGE_WIDTH) / width
        width = MAX_IMAGE_WIDTH
      }

      if (height > MAX_IMAGE_HEIGHT) {
        width = (width * MAX_IMAGE_HEIGHT) / height
        height = MAX_IMAGE_HEIGHT
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // If still too large, try with lower quality
            if (blob.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
              canvas.toBlob(
                (smallerBlob) => {
                  resolve(smallerBlob || blob)
                },
                'image/jpeg',
                0.6
              )
            } else {
              resolve(blob)
            }
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

interface JobBasicInfo {
  id: string
  job_number: string
  name: string | null
  organization_id: string
}

export default function JobCompletionPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [activeTab, setActiveTab] = useState<CompletionTab>('time')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [job, setJob] = useState<JobBasicInfo | null>(null)
  const [data, setData] = useState<CompletionData | null>(null)

  // Form states
  const [newTimeEntry, setNewTimeEntry] = useState({
    work_date: new Date().toISOString().split('T')[0],
    hours: '',
    work_type: 'regular' as TimeEntryWorkType,
    description: '',
  })

  const [newMaterial, setNewMaterial] = useState({
    material_name: '',
    quantity_used: '',
    unit: '',
    unit_cost: '',
    notes: '',
  })

  const [fieldNotes, setFieldNotes] = useState('')
  const [issuesEncountered, setIssuesEncountered] = useState('')
  const [recommendations, setRecommendations] = useState('')

  // Fetch job and completion data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch job basic info
        const jobRes = await fetch(`/api/jobs/${jobId}`)
        if (!jobRes.ok) throw new Error('Failed to load job')
        const jobData = await jobRes.json()
        setJob({
          id: jobData.id,
          job_number: jobData.job_number,
          name: jobData.name,
          organization_id: jobData.organization_id,
        })

        // Fetch completion summary
        const summaryRes = await fetch(`/api/jobs/${jobId}/complete?summary=true`)
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setData(summaryData)

          // Pre-fill form fields if completion exists
          if (summaryData.completion) {
            setFieldNotes(summaryData.completion.field_notes || '')
            setIssuesEncountered(summaryData.completion.issues_encountered || '')
            setRecommendations(summaryData.completion.recommendations || '')
          }
        }

        // Initialize checklist if empty
        const checklistRes = await fetch(`/api/jobs/${jobId}/checklist`, {
          method: 'POST',
        })
        if (checklistRes.ok) {
          // Refresh data
          const refreshRes = await fetch(`/api/jobs/${jobId}/complete?summary=true`)
          if (refreshRes.ok) {
            setData(await refreshRes.json())
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [jobId])

  // Refresh data helper
  async function refreshData() {
    const res = await fetch(`/api/jobs/${jobId}/complete?summary=true`)
    if (res.ok) {
      setData(await res.json())
    }
  }

  // Time entry handlers
  async function handleAddTimeEntry() {
    if (!newTimeEntry.hours) return

    try {
      const res = await fetch(`/api/jobs/${jobId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_date: newTimeEntry.work_date,
          hours: parseFloat(newTimeEntry.hours),
          work_type: newTimeEntry.work_type,
          description: newTimeEntry.description,
        }),
      })

      if (!res.ok) throw new Error('Failed to add time entry')

      setNewTimeEntry({
        work_date: new Date().toISOString().split('T')[0],
        hours: '',
        work_type: 'regular',
        description: '',
      })

      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time entry')
    }
  }

  async function handleDeleteTimeEntry(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/time-entries/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete time entry')
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time entry')
    }
  }

  // Material usage handlers
  async function handleAddMaterial() {
    if (!newMaterial.material_name || !newMaterial.quantity_used) return

    try {
      const res = await fetch(`/api/jobs/${jobId}/material-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_name: newMaterial.material_name,
          quantity_used: parseFloat(newMaterial.quantity_used),
          unit: newMaterial.unit || undefined,
          unit_cost: newMaterial.unit_cost ? parseFloat(newMaterial.unit_cost) : undefined,
          notes: newMaterial.notes || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to add material')

      setNewMaterial({
        material_name: '',
        quantity_used: '',
        unit: '',
        unit_cost: '',
        notes: '',
      })

      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add material')
    }
  }

  async function handleDeleteMaterial(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/material-usage/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete material')
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete material')
    }
  }

  // Photo handlers
  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>, photoType: PhotoType) {
    const file = event.target.files?.[0]
    if (!file || !job) return

    try {
      // Compress image before upload to reduce bandwidth and storage costs
      const compressedBlob = await compressImage(file)

      // Create a new File from the compressed blob
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^/.]+$/, '.jpg'),
        { type: 'image/jpeg' }
      )

      // Upload to Supabase Storage via API
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('photo_type', photoType)

      const uploadRes = await fetch(`/api/jobs/${jobId}/photos/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        // If upload endpoint doesn't exist, create photo record with placeholder
        // This would be handled by the actual upload endpoint in production
        throw new Error('Photo upload not configured')
      }

      await refreshData()
    } catch (err) {
      // For now, just show error - in production this would upload to Supabase Storage
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    }
  }

  async function handleDeletePhoto(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete photo')
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo')
    }
  }

  // Checklist handlers
  async function handleToggleChecklistItem(itemId: string, completed: boolean) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: completed }),
      })
      if (!res.ok) throw new Error('Failed to update checklist item')
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist item')
    }
  }

  // Submit completion
  async function handleSubmit() {
    try {
      setSubmitting(true)

      // Create/update completion record first
      await fetch(`/api/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_notes: fieldNotes,
          issues_encountered: issuesEncountered,
          recommendations: recommendations,
        }),
      })

      // Submit for review
      const res = await fetch(`/api/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submit: true,
          field_notes: fieldNotes,
          issues_encountered: issuesEncountered,
          recommendations: recommendations,
        }),
      })

      if (!res.ok) throw new Error('Failed to submit completion')

      router.push(`/jobs/${jobId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit completion')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate totals
  const totalHours = data?.timeEntries.reduce((sum, e) => sum + e.hours, 0) || 0
  const totalMaterialCost = data?.materialUsage.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="touch-manipulation min-h-[44px]"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">{job?.job_number}</p>
            <h1 className="text-lg font-semibold">Job Completion</h1>
          </div>

          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CompletionTab)} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid grid-cols-5 h-auto">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex flex-col gap-1 py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Time Tab */}
        <TabsContent value="time" className="flex-1 px-4 py-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Time Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="work_date">Date</Label>
                  <Input
                    id="work_date"
                    type="date"
                    value={newTimeEntry.work_date}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, work_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    placeholder="0.00"
                    value={newTimeEntry.hours}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hours: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="work_type">Work Type</Label>
                <Select
                  value={newTimeEntry.work_type}
                  onValueChange={(v) => setNewTimeEntry({ ...newTimeEntry, work_type: v as TimeEntryWorkType })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="What was done..."
                  value={newTimeEntry.description}
                  onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button onClick={handleAddTimeEntry} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Time Entry
              </Button>
            </CardContent>
          </Card>

          {/* Time entries list */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Time Entries</h3>
              <Badge variant="secondary">{totalHours.toFixed(2)} hrs total</Badge>
            </div>

            {data?.timeEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No time entries yet
              </p>
            )}

            {data?.timeEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{entry.hours} hours</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.work_date} - {entry.work_type}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTimeEntry(entry.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="flex-1 px-4 py-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Material Used</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="material_name">Material Name</Label>
                <Input
                  id="material_name"
                  placeholder="e.g., Containment bags"
                  value={newMaterial.material_name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, material_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity_used">Quantity</Label>
                  <Input
                    id="quantity_used"
                    type="number"
                    placeholder="0"
                    value={newMaterial.quantity_used}
                    onChange={(e) => setNewMaterial({ ...newMaterial, quantity_used: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    placeholder="bags"
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unit_cost">Unit Cost</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    placeholder="$0.00"
                    value={newMaterial.unit_cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, unit_cost: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button onClick={handleAddMaterial} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Material
              </Button>
            </CardContent>
          </Card>

          {/* Materials list */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Materials Used</h3>
              <Badge variant="secondary">${totalMaterialCost.toFixed(2)} total</Badge>
            </div>

            {data?.materialUsage.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No materials recorded yet
              </p>
            )}

            {data?.materialUsage.map((material) => (
              <Card key={material.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{material.material_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {material.quantity_used} {material.unit || 'units'}
                      {material.total_cost && ` - $${material.total_cost.toFixed(2)}`}
                    </p>
                    {material.variance_percent !== null && (
                      <Badge
                        variant={material.variance_percent > 10 ? 'destructive' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {material.variance_percent > 0 ? '+' : ''}{material.variance_percent.toFixed(1)}% vs estimate
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMaterial(material.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="flex-1 px-4 py-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capture Photos</CardTitle>
              <CardDescription>Take before, during, and after photos</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {PHOTO_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">{type.label}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, type.value)}
                  />
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Photos grid */}
          <div className="space-y-2">
            <h3 className="font-medium">Photos ({data?.photos.length || 0})</h3>

            {data?.photos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No photos captured yet
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {data?.photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Job photo'}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Badge className="absolute top-2 left-2 text-xs">
                    {photo.photo_type}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="flex-1 px-4 py-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Completion Checklist</h3>
            <Badge variant={
              data?.checklistProgress.required === data?.checklistProgress.completed
                ? 'default'
                : 'secondary'
            }>
              {data?.checklistProgress.completed || 0} / {data?.checklistProgress.total || 0}
            </Badge>
          </div>

          {data?.checklist && Object.entries(data.checklist).map(([category, items]) => {
            if (items.length === 0) return null

            return (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.is_completed}
                        onCheckedChange={(checked) =>
                          handleToggleChecklistItem(item.id, checked as boolean)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={item.id}
                          className={cn(
                            'text-sm font-medium cursor-pointer',
                            item.is_completed && 'line-through text-muted-foreground'
                          )}
                        >
                          {item.item_name}
                          {item.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        {item.item_description && (
                          <p className="text-xs text-muted-foreground">
                            {item.item_description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="flex-1 px-4 py-4 space-y-4 pb-24">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="font-medium">{totalHours.toFixed(2)} hrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materials Cost</span>
                <span className="font-medium">${totalMaterialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Photos</span>
                <span className="font-medium">{data?.photos.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Checklist</span>
                <span className="font-medium">
                  {data?.checklistProgress.completed || 0} / {data?.checklistProgress.total || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Field Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Field Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fieldNotes">Notes</Label>
                <Textarea
                  id="fieldNotes"
                  placeholder="General observations and notes..."
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="issues">Issues Encountered</Label>
                <Textarea
                  id="issues"
                  placeholder="Any problems or unexpected situations..."
                  value={issuesEncountered}
                  onChange={(e) => setIssuesEncountered(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  placeholder="Follow-up work or recommendations..."
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
