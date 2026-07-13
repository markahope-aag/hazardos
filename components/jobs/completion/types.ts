import type {
  JobTimeEntry,
  JobMaterialUsage,
  JobCompletionPhoto,
  JobCompletion,
  PhotoType,
  TimeEntryWorkType,
  GroupedChecklists,
} from '@/types/job-completion'
import type { JobEquipment } from '@/types/jobs'

export type CompletionTab = 'time' | 'materials' | 'equipment' | 'photos' | 'checklist' | 'review'

export interface CompletionData {
  timeEntries: JobTimeEntry[]
  materialUsage: JobMaterialUsage[]
  equipment: JobEquipment[]
  photos: JobCompletionPhoto[]
  checklist: GroupedChecklists
  completion: JobCompletion | null
  checklistProgress: { completed: number; required: number; total: number }
}

export interface TimeEntryFormState {
  work_date: string
  hours: string
  work_type: TimeEntryWorkType
  description: string
}

export interface MaterialFormState {
  material_name: string
  quantity_used: string
  unit: string
  unit_cost: string
  notes: string
}

export interface TimeEntriesTabProps {
  data: CompletionData | null
  totalHours: number
  newTimeEntry: TimeEntryFormState
  onNewTimeEntryChange: (entry: TimeEntryFormState) => void
  onAddTimeEntry: () => void
  onDeleteTimeEntry: (id: string) => void
}

export interface MaterialsTabProps {
  data: CompletionData | null
  totalMaterialCost: number
  newMaterial: MaterialFormState
  onNewMaterialChange: (material: MaterialFormState) => void
  onAddMaterial: () => void
  onDeleteMaterial: (id: string) => void
}

export interface EquipmentFormState {
  equipment_name: string
  equipment_type: string
  quantity: string
  is_rental: boolean
  rental_rate_daily: string
  rental_start_date: string
  rental_end_date: string
  notes: string
}

export interface EquipmentTabProps {
  data: CompletionData | null
  newEquipment: EquipmentFormState
  onNewEquipmentChange: (equipment: EquipmentFormState) => void
  onAddEquipment: () => void
  onDeleteEquipment: (id: string) => void
}

export interface PhotosTabProps {
  data: CompletionData | null
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>, photoType: PhotoType) => void
  onDeletePhoto: (id: string) => void
}

export interface ChecklistTabProps {
  data: CompletionData | null
  onToggleChecklistItem: (itemId: string, completed: boolean) => void
}

export interface ReviewTabProps {
  data: CompletionData | null
  totalHours: number
  totalMaterialCost: number
  fieldNotes: string
  issuesEncountered: string
  recommendations: string
  onFieldNotesChange: (value: string) => void
  onIssuesEncounteredChange: (value: string) => void
  onRecommendationsChange: (value: string) => void
}

export { type PhotoType, type TimeEntryWorkType }
