// Export all types
export * from './database'

// Additional application types
export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  organizationId?: string
  role: 'admin' | 'estimator' | 'technician' | 'viewer'
}

export interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// Form types
export interface AssessmentFormData {
  jobName: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  siteAddress: string
  siteCity: string
  siteState: string
  siteZip: string
  hazardType: 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other'
  hazardSubtype?: string
  containmentLevel?: number
  areaSqft?: number
  linearFt?: number
  volumeCuft?: number
  materialType?: string
  occupied: boolean
  accessIssues: string[]
  specialConditions?: string
  clearanceRequired: boolean
  clearanceLab?: string
  regulatoryNotificationsNeeded: boolean
  notes?: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  totalPages: number
}

// UI State types
export interface LoadingState {
  [key: string]: boolean
}

export interface ErrorState {
  [key: string]: string | null
}