'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMultiTenantAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import type {
  CreateCredentialInput,
  CreateCredentialTypeInput,
  CredentialStatus,
} from '@/lib/validations/credential'

// Client-safe DTOs (must not import the server service into the bundle).
export interface CredentialTypeDTO {
  id: string
  name: string
  category: string
  applies_to: string
  issuing_authority: string | null
  default_valid_days: number | null
  warning_lead_days: number
  required_for_containment_levels: string[] | null
  required_for_hazard_types: string[] | null
  is_active: boolean
}

export interface CredentialDTO {
  id: string
  credential_type_id: string
  worker_id: string | null
  identifier: string | null
  issued_date: string | null
  expiry_date: string | null
  document_path: string | null
  notes: string | null
  status: CredentialStatus
  credential_type_name: string
  category: string
  worker_name: string | null
}

export type RequirementState = 'valid' | 'expiring_soon' | 'expired' | 'missing'
export type WorkerReadiness = 'ready' | 'warning' | 'blocked'

export interface RequirementDTO {
  credential_type_id: string
  name: string
  category: string
  state: RequirementState
  expiry_date: string | null
}

export interface WorkerComplianceDTO {
  worker_id: string
  worker_name: string | null
  readiness: WorkerReadiness
  requirements: RequirementDTO[]
}

export interface JobComplianceDTO {
  job_id: string
  containment_level: string | null
  hazard_types: string[]
  required_type_ids: string[]
  workers: WorkerComplianceDTO[]
  summary: { ready: number; warning: number; blocked: number }
  overall: WorkerReadiness
}

export interface AssignmentCheckDTO extends WorkerComplianceDTO {
  enforcement: 'warn' | 'block'
  allowed: boolean
}

export interface TeamMemberDTO {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: string
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || body?.message || 'Request failed')
  }
  return res.json()
}

function queryString(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useCredentialTypes(options: { activeOnly?: boolean } = {}) {
  const { organization } = useMultiTenantAuth()
  return useQuery({
    queryKey: ['credential-types', organization?.id, options.activeOnly ?? false],
    queryFn: async () => {
      const data = await getJson<{ types: CredentialTypeDTO[] }>(
        `/api/credential-types${queryString({ active_only: options.activeOnly ? 'true' : undefined })}`,
      )
      return data.types
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export interface CredentialFilters {
  worker_id?: string
  credential_type_id?: string
  category?: string
  status?: CredentialStatus
  expiring_before?: string
}

export function useCredentials(filters: CredentialFilters = {}) {
  const { organization } = useMultiTenantAuth()
  return useQuery({
    queryKey: ['credentials', organization?.id, filters],
    queryFn: async () => {
      const data = await getJson<{ credentials: CredentialDTO[] }>(
        `/api/credentials${queryString({
          worker_id: filters.worker_id,
          credential_type_id: filters.credential_type_id,
          category: filters.category,
          status: filters.status,
          expiring_before: filters.expiring_before,
        })}`,
      )
      return data.credentials
    },
    enabled: !!organization?.id,
    staleTime: 60 * 1000,
  })
}

export function useJobCompliance(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['job-compliance', jobId],
    queryFn: () => getJson<JobComplianceDTO>(`/api/jobs/${jobId}/compliance`),
    enabled: !!jobId && enabled,
    staleTime: 60 * 1000,
  })
}

export function useTeamMembers() {
  const { organization } = useMultiTenantAuth()
  return useQuery({
    queryKey: ['team', organization?.id],
    queryFn: async () => {
      const data = await getJson<{ members: TeamMemberDTO[] }>('/api/team')
      return data.members
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  })
}

/** Imperative single-worker gate check (used inside the assign dialog). */
export function fetchWorkerJobCheck(jobId: string, workerId: string): Promise<AssignmentCheckDTO> {
  return getJson<AssignmentCheckDTO>(`/api/jobs/${jobId}/compliance?worker_id=${workerId}`)
}

export function useCreateCredential() {
  const queryClient = useQueryClient()
  const { organization } = useMultiTenantAuth()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (input: CreateCredentialInput) => {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || body?.message || 'Failed to save credential')
      }
      return res.json() as Promise<CredentialDTO>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials', organization?.id] })
      toast({ title: 'Credential saved' })
    },
    onError: (error) => {
      toast({
        title: 'Could not save credential',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })
}

export function useCreateCredentialType() {
  const queryClient = useQueryClient()
  const { organization } = useMultiTenantAuth()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (input: CreateCredentialTypeInput) => {
      const res = await fetch('/api/credential-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || body?.message || 'Failed to save credential type')
      }
      return res.json() as Promise<CredentialTypeDTO>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', organization?.id] })
      toast({ title: 'Credential type saved' })
    },
    onError: (error) => {
      toast({
        title: 'Could not save credential type',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })
}
