import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock job management API functionality
interface Job {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  customer_id: string
  assigned_to?: string[]
  estimated_hours?: number
  actual_hours?: number
  scheduled_date?: string
  completed_date?: string
  location: {
    address: string
    city: string
    state: string
    zip: string
    coordinates?: { lat: number; lng: number }
  }
  hazards: string[]
  equipment_needed: string[]
  materials_needed: string[]
  created_at: string
  updated_at: string
  created_by: string
}

interface CreateJobRequest {
  title: string
  description: string
  customer_id: string
  priority?: Job['priority']
  estimated_hours?: number
  scheduled_date?: string
  location: Job['location']
  hazards?: string[]
  equipment_needed?: string[]
  materials_needed?: string[]
}

interface UpdateJobRequest extends Partial<CreateJobRequest> {
  status?: Job['status']
  assigned_to?: string[]
  actual_hours?: number
  completed_date?: string
}

interface JobFilters {
  status?: Job['status'][]
  priority?: Job['priority'][]
  customer_id?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
  search?: string
}

class MockJobService {
  private jobs: Map<string, Job> = new Map()
  private nextId = 1

  constructor() {
    // Add sample jobs
    this.createSampleJobs()
  }

  private createSampleJobs() {
    const sampleJobs: Omit<Job, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        title: 'Asbestos Removal - Office Building',
        description: 'Remove asbestos tiles from basement level',
        status: 'pending',
        priority: 'high',
        customer_id: 'customer-1',
        assigned_to: ['worker-1', 'worker-2'],
        estimated_hours: 16,
        scheduled_date: '2024-02-15T09:00:00Z',
        location: {
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          coordinates: { lat: 39.7817, lng: -89.6501 }
        },
        hazards: ['asbestos', 'confined_space'],
        equipment_needed: ['respirators', 'protective_suits', 'vacuum'],
        materials_needed: ['disposal_bags', 'sealant'],
        created_by: 'user-1'
      },
      {
        title: 'Lead Paint Inspection',
        description: 'Inspect residential property for lead paint',
        status: 'in_progress',
        priority: 'medium',
        customer_id: 'customer-2',
        assigned_to: ['worker-3'],
        estimated_hours: 4,
        actual_hours: 2.5,
        scheduled_date: '2024-02-10T10:00:00Z',
        location: {
          address: '456 Oak Ave',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        hazards: ['lead'],
        equipment_needed: ['test_kits', 'ladder'],
        materials_needed: ['sample_containers'],
        created_by: 'user-2'
      },
      {
        title: 'Mold Remediation',
        description: 'Remove mold from water-damaged basement',
        status: 'completed',
        priority: 'urgent',
        customer_id: 'customer-1',
        assigned_to: ['worker-1', 'worker-4'],
        estimated_hours: 12,
        actual_hours: 14,
        scheduled_date: '2024-02-05T08:00:00Z',
        completed_date: '2024-02-06T16:00:00Z',
        location: {
          address: '789 Pine Rd',
          city: 'Springfield',
          state: 'IL',
          zip: '62703'
        },
        hazards: ['mold', 'moisture'],
        equipment_needed: ['dehumidifiers', 'air_scrubbers'],
        materials_needed: ['antimicrobial', 'plastic_sheeting'],
        created_by: 'user-1'
      }
    ]

    sampleJobs.forEach(jobData => {
      const job: Job = {
        ...jobData,
        id: `job-${this.nextId++}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      this.jobs.set(job.id, job)
    })
  }

  async createJob(data: CreateJobRequest, userId: string): Promise<Job> {
    // Validation
    this.validateJobData(data)

    const job: Job = {
      id: `job-${this.nextId++}`,
      title: data.title,
      description: data.description,
      status: 'pending',
      priority: data.priority || 'medium',
      customer_id: data.customer_id,
      estimated_hours: data.estimated_hours,
      scheduled_date: data.scheduled_date,
      location: data.location,
      hazards: data.hazards || [],
      equipment_needed: data.equipment_needed || [],
      materials_needed: data.materials_needed || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId
    }

    this.jobs.set(job.id, job)
    return job
  }

  async updateJob(id: string, data: UpdateJobRequest, _userId: string): Promise<Job> {
    const job = this.jobs.get(id)
    if (!job) {
      throw new Error('Job not found')
    }

    // Validate status transitions
    if (data.status) {
      this.validateStatusTransition(job.status, data.status)
    }

    // Auto-set completed_date when status changes to completed
    if (data.status === 'completed' && job.status !== 'completed') {
      data.completed_date = new Date().toISOString()
    }

    const updatedJob: Job = {
      ...job,
      ...data,
      updated_at: new Date().toISOString()
    }

    this.jobs.set(id, updatedJob)
    return updatedJob
  }

  async getJob(id: string): Promise<Job | null> {
    return this.jobs.get(id) || null
  }

  async getJobs(filters: JobFilters = {}, page = 1, limit = 20): Promise<{
    jobs: Job[]
    total: number
    page: number
    limit: number
  }> {
    let filteredJobs = Array.from(this.jobs.values())

    // Apply filters
    if (filters.status?.length) {
      filteredJobs = filteredJobs.filter(job => filters.status!.includes(job.status))
    }

    if (filters.priority?.length) {
      filteredJobs = filteredJobs.filter(job => filters.priority!.includes(job.priority))
    }

    if (filters.customer_id) {
      filteredJobs = filteredJobs.filter(job => job.customer_id === filters.customer_id)
    }

    if (filters.assigned_to) {
      filteredJobs = filteredJobs.filter(job => 
        job.assigned_to?.includes(filters.assigned_to!)
      )
    }

    if (filters.date_from) {
      filteredJobs = filteredJobs.filter(job => 
        job.scheduled_date && job.scheduled_date >= filters.date_from!
      )
    }

    if (filters.date_to) {
      filteredJobs = filteredJobs.filter(job => 
        job.scheduled_date && job.scheduled_date <= filters.date_to!
      )
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredJobs = filteredJobs.filter(job =>
        job.title.toLowerCase().includes(searchLower) ||
        job.description.toLowerCase().includes(searchLower) ||
        job.location.address.toLowerCase().includes(searchLower)
      )
    }

    // Sort by created_at desc
    filteredJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = filteredJobs.length
    const offset = (page - 1) * limit
    const jobs = filteredJobs.slice(offset, offset + limit)

    return { jobs, total, page, limit }
  }

  async deleteJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id)
    if (!job) {
      return false
    }

    // Don't allow deletion of in-progress or completed jobs
    if (job.status === 'in_progress' || job.status === 'completed') {
      throw new Error('Cannot delete jobs that are in progress or completed')
    }

    return this.jobs.delete(id)
  }

  async assignWorkers(jobId: string, workerIds: string[]): Promise<Job> {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error('Job not found')
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      throw new Error('Cannot assign workers to completed or cancelled jobs')
    }

    const updatedJob: Job = {
      ...job,
      assigned_to: workerIds,
      updated_at: new Date().toISOString()
    }

    this.jobs.set(jobId, updatedJob)
    return updatedJob
  }

  private validateJobData(data: CreateJobRequest): void {
    if (!data.title?.trim()) {
      throw new Error('Job title is required')
    }

    if (!data.description?.trim()) {
      throw new Error('Job description is required')
    }

    if (!data.customer_id?.trim()) {
      throw new Error('Customer ID is required')
    }

    if (!data.location?.address?.trim()) {
      throw new Error('Job location address is required')
    }

    if (!data.location?.city?.trim()) {
      throw new Error('Job location city is required')
    }

    if (!data.location?.state?.trim()) {
      throw new Error('Job location state is required')
    }

    if (!data.location?.zip?.trim()) {
      throw new Error('Job location ZIP code is required')
    }

    if (data.estimated_hours && data.estimated_hours <= 0) {
      throw new Error('Estimated hours must be greater than 0')
    }

    if (data.scheduled_date && new Date(data.scheduled_date) < new Date()) {
      throw new Error('Scheduled date cannot be in the past')
    }
  }

  private validateStatusTransition(currentStatus: Job['status'], newStatus: Job['status']): void {
    const validTransitions: Record<Job['status'], Job['status'][]> = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // No transitions from completed
      cancelled: ['pending'] // Can reopen cancelled jobs
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`)
    }
  }

  getJobStats(): {
    total: number
    by_status: Record<Job['status'], number>
    by_priority: Record<Job['priority'], number>
    avg_estimated_hours: number
    avg_actual_hours: number
  } {
    const jobs = Array.from(this.jobs.values())
    
    const by_status: Record<Job['status'], number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    }

    const by_priority: Record<Job['priority'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    }

    let totalEstimated = 0
    let totalActual = 0
    let estimatedCount = 0
    let actualCount = 0

    jobs.forEach(job => {
      by_status[job.status]++
      by_priority[job.priority]++

      if (job.estimated_hours) {
        totalEstimated += job.estimated_hours
        estimatedCount++
      }

      if (job.actual_hours) {
        totalActual += job.actual_hours
        actualCount++
      }
    })

    return {
      total: jobs.length,
      by_status,
      by_priority,
      avg_estimated_hours: estimatedCount > 0 ? totalEstimated / estimatedCount : 0,
      avg_actual_hours: actualCount > 0 ? totalActual / actualCount : 0
    }
  }
}

// Mock API handlers
async function createJobHandler(request: NextRequest): Promise<Response> {
  const jobService = new MockJobService()
  
  try {
    const body: CreateJobRequest = await request.json()
    const userId = request.headers.get('x-user-id') || 'anonymous'

    const job = await jobService.createJob(body, userId)

    return new Response(JSON.stringify(job), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function getJobsHandler(request: NextRequest): Promise<Response> {
  const jobService = new MockJobService()
  
  try {
    const url = new URL(request.url)
    const filters: JobFilters = {}
    
    // Parse query parameters
    const status = url.searchParams.get('status')
    if (status) filters.status = status.split(',') as Job['status'][]
    
    const priority = url.searchParams.get('priority')
    if (priority) filters.priority = priority.split(',') as Job['priority'][]
    
    if (url.searchParams.get('customer_id')) {
      filters.customer_id = url.searchParams.get('customer_id')!
    }
    
    if (url.searchParams.get('assigned_to')) {
      filters.assigned_to = url.searchParams.get('assigned_to')!
    }
    
    if (url.searchParams.get('date_from')) {
      filters.date_from = url.searchParams.get('date_from')!
    }
    
    if (url.searchParams.get('date_to')) {
      filters.date_to = url.searchParams.get('date_to')!
    }
    
    if (url.searchParams.get('search')) {
      filters.search = url.searchParams.get('search')!
    }

    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const result = await jobService.getJobs(filters, page, limit)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

describe('Jobs API', () => {
  let jobService: MockJobService

  beforeEach(() => {
    jobService = new MockJobService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('job creation', () => {
    const validJobData: CreateJobRequest = {
      title: 'Test Job',
      description: 'Test job description',
      customer_id: 'customer-1',
      priority: 'medium',
      estimated_hours: 8,
      scheduled_date: '2024-12-31T10:00:00Z',
      location: {
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345'
      },
      hazards: ['asbestos'],
      equipment_needed: ['respirators'],
      materials_needed: ['disposal_bags']
    }

    it('should create job with valid data', async () => {
      const job = await jobService.createJob(validJobData, 'user-1')

      expect(job.id).toBeDefined()
      expect(job.title).toBe(validJobData.title)
      expect(job.status).toBe('pending')
      expect(job.created_by).toBe('user-1')
      expect(job.created_at).toBeDefined()
      expect(job.updated_at).toBeDefined()
    })

    it('should reject job without title', async () => {
      const invalidData = { ...validJobData, title: '' }

      await expect(jobService.createJob(invalidData, 'user-1'))
        .rejects.toThrow('Job title is required')
    })

    it('should reject job without description', async () => {
      const invalidData = { ...validJobData, description: '' }

      await expect(jobService.createJob(invalidData, 'user-1'))
        .rejects.toThrow('Job description is required')
    })

    it('should reject job without customer_id', async () => {
      const invalidData = { ...validJobData, customer_id: '' }

      await expect(jobService.createJob(invalidData, 'user-1'))
        .rejects.toThrow('Customer ID is required')
    })

    it('should reject job with incomplete location', async () => {
      const invalidData = { 
        ...validJobData, 
        location: { ...validJobData.location, address: '' }
      }

      await expect(jobService.createJob(invalidData, 'user-1'))
        .rejects.toThrow('Job location address is required')
    })

    it('should reject job with negative estimated hours', async () => {
      const invalidData = { ...validJobData, estimated_hours: -5 }

      await expect(jobService.createJob(invalidData, 'user-1'))
        .rejects.toThrow('Estimated hours must be greater than 0')
    })

    it('should reject job with past scheduled date', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const invalidData = { ...validJobData, scheduled_date: pastDate }

      await expect(jobService.createJob(invalidData, 'user-1'))
        .rejects.toThrow('Scheduled date cannot be in the past')
    })

    it('should set default values for optional fields', async () => {
      const minimalData = {
        title: 'Minimal Job',
        description: 'Minimal description',
        customer_id: 'customer-1',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      }

      const job = await jobService.createJob(minimalData, 'user-1')

      expect(job.priority).toBe('medium')
      expect(job.hazards).toEqual([])
      expect(job.equipment_needed).toEqual([])
      expect(job.materials_needed).toEqual([])
    })
  })

  describe('job retrieval', () => {
    it('should get job by id', async () => {
      const createdJob = await jobService.createJob({
        title: 'Test Job',
        description: 'Test description',
        customer_id: 'customer-1',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      }, 'user-1')

      const retrievedJob = await jobService.getJob(createdJob.id)
      expect(retrievedJob).toEqual(createdJob)
    })

    it('should return null for non-existent job', async () => {
      const job = await jobService.getJob('non-existent-id')
      expect(job).toBeNull()
    })

    it('should get jobs with pagination', async () => {
      const result = await jobService.getJobs({}, 1, 2)

      expect(result.jobs).toHaveLength(2)
      expect(result.total).toBeGreaterThan(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(2)
    })

    it('should filter jobs by status', async () => {
      const result = await jobService.getJobs({ status: ['completed'] })

      expect(result.jobs.every(job => job.status === 'completed')).toBe(true)
    })

    it('should filter jobs by priority', async () => {
      const result = await jobService.getJobs({ priority: ['high', 'urgent'] })

      expect(result.jobs.every(job => ['high', 'urgent'].includes(job.priority))).toBe(true)
    })

    it('should filter jobs by customer', async () => {
      const result = await jobService.getJobs({ customer_id: 'customer-1' })

      expect(result.jobs.every(job => job.customer_id === 'customer-1')).toBe(true)
    })

    it('should search jobs by text', async () => {
      const result = await jobService.getJobs({ search: 'asbestos' })

      expect(result.jobs.length).toBeGreaterThan(0)
      expect(result.jobs.some(job => 
        job.title.toLowerCase().includes('asbestos') ||
        job.description.toLowerCase().includes('asbestos')
      )).toBe(true)
    })

    it('should filter jobs by date range', async () => {
      const result = await jobService.getJobs({
        date_from: '2024-02-01T00:00:00Z',
        date_to: '2024-02-28T23:59:59Z'
      })

      expect(result.jobs.every(job => {
        if (!job.scheduled_date) return false
        const date = new Date(job.scheduled_date)
        return date >= new Date('2024-02-01') && date <= new Date('2024-02-28')
      })).toBe(true)
    })
  })

  describe('job updates', () => {
    let testJob: Job

    beforeEach(async () => {
      testJob = await jobService.createJob({
        title: 'Test Job',
        description: 'Test description',
        customer_id: 'customer-1',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      }, 'user-1')
    })

    it('should update job fields', async () => {
      const updatedJob = await jobService.updateJob(testJob.id, {
        title: 'Updated Title',
        priority: 'high'
      }, 'user-1')

      expect(updatedJob.title).toBe('Updated Title')
      expect(updatedJob.priority).toBe('high')
      expect(updatedJob.updated_at).not.toBe(testJob.updated_at)
    })

    it('should validate status transitions', async () => {
      // Valid transition: pending -> in_progress
      await jobService.updateJob(testJob.id, { status: 'in_progress' }, 'user-1')

      // Invalid transition: in_progress -> pending (not allowed)
      await expect(
        jobService.updateJob(testJob.id, { status: 'pending' }, 'user-1')
      ).rejects.toThrow('Invalid status transition')
    })

    it('should auto-set completed_date when job is completed', async () => {
      const beforeComplete = Date.now()
      
      const updatedJob = await jobService.updateJob(testJob.id, { 
        status: 'completed' 
      }, 'user-1')

      expect(updatedJob.completed_date).toBeDefined()
      expect(new Date(updatedJob.completed_date!).getTime()).toBeGreaterThanOrEqual(beforeComplete)
    })

    it('should throw error for non-existent job', async () => {
      await expect(
        jobService.updateJob('non-existent', { title: 'New Title' }, 'user-1')
      ).rejects.toThrow('Job not found')
    })
  })

  describe('worker assignment', () => {
    let testJob: Job

    beforeEach(async () => {
      testJob = await jobService.createJob({
        title: 'Test Job',
        description: 'Test description',
        customer_id: 'customer-1',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      }, 'user-1')
    })

    it('should assign workers to job', async () => {
      const updatedJob = await jobService.assignWorkers(testJob.id, ['worker-1', 'worker-2'])

      expect(updatedJob.assigned_to).toEqual(['worker-1', 'worker-2'])
    })

    it('should not allow assignment to completed jobs', async () => {
      await jobService.updateJob(testJob.id, { status: 'completed' }, 'user-1')

      await expect(
        jobService.assignWorkers(testJob.id, ['worker-1'])
      ).rejects.toThrow('Cannot assign workers to completed or cancelled jobs')
    })

    it('should throw error for non-existent job', async () => {
      await expect(
        jobService.assignWorkers('non-existent', ['worker-1'])
      ).rejects.toThrow('Job not found')
    })
  })

  describe('job deletion', () => {
    it('should delete pending job', async () => {
      const job = await jobService.createJob({
        title: 'Test Job',
        description: 'Test description',
        customer_id: 'customer-1',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      }, 'user-1')

      const deleted = await jobService.deleteJob(job.id)
      expect(deleted).toBe(true)

      const retrievedJob = await jobService.getJob(job.id)
      expect(retrievedJob).toBeNull()
    })

    it('should not delete in-progress job', async () => {
      const job = await jobService.createJob({
        title: 'Test Job',
        description: 'Test description',
        customer_id: 'customer-1',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      }, 'user-1')

      await jobService.updateJob(job.id, { status: 'in_progress' }, 'user-1')

      await expect(jobService.deleteJob(job.id))
        .rejects.toThrow('Cannot delete jobs that are in progress or completed')
    })

    it('should return false for non-existent job', async () => {
      const deleted = await jobService.deleteJob('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('job statistics', () => {
    it('should calculate job statistics', () => {
      const stats = jobService.getJobStats()

      expect(stats.total).toBeGreaterThan(0)
      expect(stats.by_status.pending).toBeGreaterThanOrEqual(0)
      expect(stats.by_status.in_progress).toBeGreaterThanOrEqual(0)
      expect(stats.by_status.completed).toBeGreaterThanOrEqual(0)
      expect(stats.by_priority.low).toBeGreaterThanOrEqual(0)
      expect(stats.avg_estimated_hours).toBeGreaterThanOrEqual(0)
    })
  })

  describe('API endpoints', () => {
    it('should handle job creation request', async () => {
      const request = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: 'API Test Job',
          description: 'Test job via API',
          customer_id: 'customer-1',
          location: {
            address: '123 API St',
            city: 'API City',
            state: 'AP',
            zip: '12345'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await createJobHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.title).toBe('API Test Job')
      expect(data.id).toBeDefined()
    })

    it('should handle invalid job creation request', async () => {
      const request = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: '', // Invalid: empty title
          description: 'Test description',
          customer_id: 'customer-1'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await createJobHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('title is required')
    })

    it('should handle jobs listing request', async () => {
      const request = new NextRequest('http://localhost/api/jobs?status=pending&page=1&limit=10')

      const response = await getJobsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      expect(data.total).toBeDefined()
      expect(data.page).toBe(1)
      expect(data.limit).toBe(10)
    })

    it('should handle jobs search request', async () => {
      const request = new NextRequest('http://localhost/api/jobs?search=asbestos&priority=high,urgent')

      const response = await getJobsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle malformed request data', async () => {
      const request = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await createJobHandler(request)
      expect(response.status).toBe(400)
    })

    it('should handle very long job titles', async () => {
      const longTitle = 'A'.repeat(1000)
      
      const job = await jobService.createJob({
        title: longTitle,
        description: 'Test description',
        customer_id: 'customer-1',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      }, 'user-1')

      expect(job.title).toBe(longTitle)
    })

    it('should handle special characters in job data', async () => {
      const specialData = {
        title: 'Job with "quotes" & <tags>',
        description: 'Description with émojis 🔧 and unicode',
        customer_id: 'customer-1',
        location: {
          address: '123 O\'Reilly St',
          city: 'São Paulo',
          state: 'SP',
          zip: '12345-678'
        }
      }

      const job = await jobService.createJob(specialData, 'user-1')
      expect(job.title).toBe(specialData.title)
      expect(job.description).toBe(specialData.description)
    })

    it('should handle concurrent job operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        jobService.createJob({
          title: `Concurrent Job ${i}`,
          description: `Description ${i}`,
          customer_id: 'customer-1',
          location: {
            address: `${i} Test St`,
            city: 'Test City',
            state: 'TS',
            zip: '12345'
          }
        }, 'user-1')
      )

      const jobs = await Promise.all(promises)
      
      expect(jobs).toHaveLength(10)
      expect(new Set(jobs.map(j => j.id)).size).toBe(10) // All unique IDs
    })
  })
})