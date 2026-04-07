'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, Package, Camera, CheckSquare, FileText, X, AlertCircle, Loader2, ChevronLeft, Send } from 'lucide-react'
import { useJobCompletion } from '@/components/jobs/completion/use-job-completion'
import { TimeEntriesTab } from '@/components/jobs/completion/time-entries-tab'
import { MaterialsTab } from '@/components/jobs/completion/materials-tab'
import { PhotosTab } from '@/components/jobs/completion/photos-tab'
import { ChecklistTab } from '@/components/jobs/completion/checklist-tab'
import { ReviewTab } from '@/components/jobs/completion/review-tab'
import type { CompletionTab } from '@/components/jobs/completion/types'

const TABS: { value: CompletionTab; label: string; icon: React.ReactNode }[] = [
  { value: 'time', label: 'Time', icon: <Clock className="w-4 h-4" /> },
  { value: 'materials', label: 'Materials', icon: <Package className="w-4 h-4" /> },
  { value: 'photos', label: 'Photos', icon: <Camera className="w-4 h-4" /> },
  { value: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'review', label: 'Review', icon: <FileText className="w-4 h-4" /> },
]

export default function JobCompletionPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const [activeTab, setActiveTab] = useState<CompletionTab>('time')

  const {
    loading, submitting, error, setError, job, data,
    newTimeEntry, setNewTimeEntry, newMaterial, setNewMaterial,
    fieldNotes, setFieldNotes, issuesEncountered, setIssuesEncountered, recommendations, setRecommendations,
    totalHours, totalMaterialCost,
    handleAddTimeEntry, handleDeleteTimeEntry,
    handleAddMaterial, handleDeleteMaterial,
    handlePhotoUpload, handleDeletePhoto,
    handleToggleChecklistItem, handleSubmit,
  } = useJobCompletion(jobId)

  async function onSubmit() {
    const success = await handleSubmit()
    if (success) router.push(`/jobs/${jobId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/jobs/${jobId}`)} className="touch-manipulation min-h-[44px]">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{job?.job_number}</p>
            <h1 className="text-lg font-semibold">Job Completion</h1>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="p-1 h-auto">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CompletionTab)} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid grid-cols-5 h-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col gap-1 py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="time">
          <TimeEntriesTab data={data} totalHours={totalHours} newTimeEntry={newTimeEntry} onNewTimeEntryChange={setNewTimeEntry} onAddTimeEntry={handleAddTimeEntry} onDeleteTimeEntry={handleDeleteTimeEntry} />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsTab data={data} totalMaterialCost={totalMaterialCost} newMaterial={newMaterial} onNewMaterialChange={setNewMaterial} onAddMaterial={handleAddMaterial} onDeleteMaterial={handleDeleteMaterial} />
        </TabsContent>
        <TabsContent value="photos">
          <PhotosTab data={data} onPhotoUpload={handlePhotoUpload} onDeletePhoto={handleDeletePhoto} />
        </TabsContent>
        <TabsContent value="checklist">
          <ChecklistTab data={data} onToggleChecklistItem={handleToggleChecklistItem} />
        </TabsContent>
        <TabsContent value="review">
          <ReviewTab data={data} totalHours={totalHours} totalMaterialCost={totalMaterialCost} fieldNotes={fieldNotes} issuesEncountered={issuesEncountered} recommendations={recommendations} onFieldNotesChange={setFieldNotes} onIssuesEncounteredChange={setIssuesEncountered} onRecommendationsChange={setRecommendations} />
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button onClick={onSubmit} disabled={submitting} className="w-full" size="lg">
          {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>) : (<><Send className="w-4 h-4 mr-2" />Submit for Review</>)}
        </Button>
      </div>
    </div>
  )
}
