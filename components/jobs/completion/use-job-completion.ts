'use client'

import { useState, useEffect } from 'react'
import { compressImage } from '@/lib/utils/compress-image'
import type { CompletionData, TimeEntryFormState, MaterialFormState } from './types'
import type { PhotoType } from '@/types/job-completion'

interface JobBasicInfo {
  id: string
  job_number: string
  name: string | null
  organization_id: string
}

const INITIAL_TIME_ENTRY: TimeEntryFormState = {
  work_date: new Date().toISOString().split('T')[0],
  hours: '',
  work_type: 'regular',
  description: '',
}

const INITIAL_MATERIAL: MaterialFormState = {
  material_name: '',
  quantity_used: '',
  unit: '',
  unit_cost: '',
  notes: '',
}

export function useJobCompletion(jobId: string) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [job, setJob] = useState<JobBasicInfo | null>(null)
  const [data, setData] = useState<CompletionData | null>(null)

  const [newTimeEntry, setNewTimeEntry] = useState<TimeEntryFormState>(INITIAL_TIME_ENTRY)
  const [newMaterial, setNewMaterial] = useState<MaterialFormState>(INITIAL_MATERIAL)
  const [fieldNotes, setFieldNotes] = useState('')
  const [issuesEncountered, setIssuesEncountered] = useState('')
  const [recommendations, setRecommendations] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const jobRes = await fetch(`/api/jobs/${jobId}`)
        if (!jobRes.ok) throw new Error('Failed to load job')
        const jobData = await jobRes.json()
        setJob({ id: jobData.id, job_number: jobData.job_number, name: jobData.name, organization_id: jobData.organization_id })

        const summaryRes = await fetch(`/api/jobs/${jobId}/complete?summary=true`)
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setData(summaryData)
          if (summaryData.completion) {
            setFieldNotes(summaryData.completion.field_notes || '')
            setIssuesEncountered(summaryData.completion.issues_encountered || '')
            setRecommendations(summaryData.completion.recommendations || '')
          }
        }

        const checklistRes = await fetch(`/api/jobs/${jobId}/checklist`, { method: 'POST' })
        if (checklistRes.ok) {
          const refreshRes = await fetch(`/api/jobs/${jobId}/complete?summary=true`)
          if (refreshRes.ok) setData(await refreshRes.json())
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [jobId])

  async function refreshData() {
    const res = await fetch(`/api/jobs/${jobId}/complete?summary=true`)
    if (res.ok) setData(await res.json())
  }

  function handleError(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback)
  }

  async function handleAddTimeEntry() {
    if (!newTimeEntry.hours) return
    try {
      const res = await fetch(`/api/jobs/${jobId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_date: newTimeEntry.work_date, hours: parseFloat(newTimeEntry.hours), work_type: newTimeEntry.work_type, description: newTimeEntry.description }),
      })
      if (!res.ok) throw new Error('Failed to add time entry')
      setNewTimeEntry({ ...INITIAL_TIME_ENTRY, work_date: new Date().toISOString().split('T')[0] })
      await refreshData()
    } catch (err) { handleError(err, 'Failed to add time entry') }
  }

  async function handleDeleteTimeEntry(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/time-entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete time entry')
      await refreshData()
    } catch (err) { handleError(err, 'Failed to delete time entry') }
  }

  async function handleAddMaterial() {
    if (!newMaterial.material_name || !newMaterial.quantity_used) return
    try {
      const res = await fetch(`/api/jobs/${jobId}/material-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_name: newMaterial.material_name, quantity_used: parseFloat(newMaterial.quantity_used), unit: newMaterial.unit || undefined, unit_cost: newMaterial.unit_cost ? parseFloat(newMaterial.unit_cost) : undefined, notes: newMaterial.notes || undefined }),
      })
      if (!res.ok) throw new Error('Failed to add material')
      setNewMaterial(INITIAL_MATERIAL)
      await refreshData()
    } catch (err) { handleError(err, 'Failed to add material') }
  }

  async function handleDeleteMaterial(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/material-usage/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete material')
      await refreshData()
    } catch (err) { handleError(err, 'Failed to delete material') }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>, photoType: PhotoType) {
    const file = event.target.files?.[0]
    if (!file || !job) return
    try {
      const compressedBlob = await compressImage(file)
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('photo_type', photoType)
      const uploadRes = await fetch(`/api/jobs/${jobId}/photos/upload`, { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Photo upload not configured')
      await refreshData()
    } catch (err) { handleError(err, 'Failed to upload photo') }
  }

  async function handleDeletePhoto(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete photo')
      await refreshData()
    } catch (err) { handleError(err, 'Failed to delete photo') }
  }

  async function handleToggleChecklistItem(itemId: string, completed: boolean) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_completed: completed }) })
      if (!res.ok) throw new Error('Failed to update checklist item')
      await refreshData()
    } catch (err) { handleError(err, 'Failed to update checklist item') }
  }

  async function handleSubmit() {
    try {
      setSubmitting(true)
      await fetch(`/api/jobs/${jobId}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field_notes: fieldNotes, issues_encountered: issuesEncountered, recommendations }) })
      const res = await fetch(`/api/jobs/${jobId}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submit: true, field_notes: fieldNotes, issues_encountered: issuesEncountered, recommendations }) })
      if (!res.ok) throw new Error('Failed to submit completion')
      return true
    } catch (err) {
      handleError(err, 'Failed to submit completion')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const totalHours = data?.timeEntries.reduce((sum, e) => sum + e.hours, 0) || 0
  const totalMaterialCost = data?.materialUsage.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0

  return {
    loading, submitting, error, setError, job, data,
    newTimeEntry, setNewTimeEntry, newMaterial, setNewMaterial,
    fieldNotes, setFieldNotes, issuesEncountered, setIssuesEncountered, recommendations, setRecommendations,
    totalHours, totalMaterialCost,
    handleAddTimeEntry, handleDeleteTimeEntry,
    handleAddMaterial, handleDeleteMaterial,
    handlePhotoUpload, handleDeletePhoto,
    handleToggleChecklistItem, handleSubmit,
  }
}
