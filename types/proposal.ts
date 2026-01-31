import type { Organization, Assessment, Estimate, EquipmentNeeded, MaterialNeeded } from './database'

export interface ProposalData {
  // Organization (company generating the proposal)
  organization: Pick<Organization, 'name' | 'address' | 'city' | 'state' | 'zip' | 'phone' | 'email' | 'license_number'>

  // Customer & Site info (from assessment)
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  siteAddress: string
  siteCity: string
  siteState: string
  siteZip: string

  // Job details
  jobName: string
  hazardType: string
  hazardSubtype?: string | null
  containmentLevel?: number | null
  areaSqft?: number | null
  linearFt?: number | null

  // Estimate details
  estimatedDurationDays: number
  crewSize: number
  crewType?: string | null

  // Line items
  laborCost: number
  laborHours: number
  laborRate: number
  equipmentItems: EquipmentNeeded[]
  equipmentCost: number
  materialItems: MaterialNeeded[]
  materialsCost: number
  disposalMethod?: string | null
  disposalCost: number

  // Totals
  subtotal: number
  markupPercentage: number
  markupAmount: number
  totalPrice: number

  // Proposal metadata
  proposalNumber: string
  proposalDate: string
  validUntil: string

  // Terms
  paymentTerms?: string
  scopeOfWork?: string
  exclusions?: string[]
  notes?: string | null
}

export interface ProposalGenerateRequest {
  estimateId: string
  customTerms?: {
    paymentTerms?: string
    validDays?: number
    exclusions?: string[]
  }
}

export function generateProposalNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `PROP-${year}${month}-${random}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function getHazardTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    asbestos: 'Asbestos Abatement',
    mold: 'Mold Remediation',
    lead: 'Lead Paint Abatement',
    vermiculite: 'Vermiculite Removal',
    other: 'Environmental Remediation',
  }
  return labels[type] || type
}

export function getContainmentLevelLabel(level: number | null | undefined): string {
  if (!level) return ''
  const labels: Record<number, string> = {
    1: 'Level 1 (Minimal)',
    2: 'Level 2 (Limited)',
    3: 'Level 3 (Extensive)',
    4: 'Level 4 (Full Containment)',
  }
  return labels[level] || `Level ${level}`
}
