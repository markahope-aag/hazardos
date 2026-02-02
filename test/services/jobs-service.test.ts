import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job, CreateJobInput, CreateJobFromProposalInput, UpdateJobInput } from '@/types/jobs'

// Use vi.hoisted to create mocks before vi.mock is processed
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  in: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}))

// Setup chainable mock
const setupChainableMock = () => {
  mockSupabase.from.mockReturnValue(mockSupabase)
  mockSupabase.select.mockReturnValue(mockSupabase)
  mockSupabase.insert.mockReturnValue(mockSupabase)
  mockSupabase.update.mockReturnValue(mockSupabase)
  mockSupabase.delete.mockReturnValue(mockSupabase)
  mockSupabase.eq.mockReturnValue(mockSupabase)
  mockSupabase.neq.mockReturnValue(mockSupabase)
  mockSupabase.in.mockReturnValue(mockSupabase)
  mockSupabase.gte.mockReturnValue(mockSupabase)
  mockSupabase.lte.mockReturnValue(mockSupabase)
  mockSupabase.order.mockReturnValue(mockSupabase)
}

// Mock activity service
const mockActivity = vi.hoisted(() => ({
  created: vi.fn(),
  statusChanged: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/services/activity-service', () => ({
  Activity: mockActivity,
}))

import { JobsService } from '@/lib/services/jobs-service'

describe('JobsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupChainableMock()
  })

  describe('create', () => {
    const mockUser = { id: 'user-1' }
    const mockProfile = { organization_id: 'org-1' }
    const mockJobNumber = 'JOB-001'

    const mockInput: CreateJobInput = {
      customer_id: 'customer-1',
      name: 'Asbestos Removal',
      scheduled_start_date: '2026-02-15',
      scheduled_start_time: '09:00',
      scheduled_end_date: '2026-02-15',
      estimated_duration_hours: 8,
      job_address: '123 Main St',
      job_city: 'Los Angeles',
      job_state: 'CA',
      job_zip: '90001',
    }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.rpc.mockResolvedValue({ data: mockJobNumber, error: null })
    })

    it('should create a new job successfully', async () => {
      const mockJob: Partial<Job> = {
        id: 'job-1',
        job_number: mockJobNumber,
        ...mockInput,
        organization_id: 'org-1',
        status: 'scheduled',
        created_by: mockUser.id,
        customer: { id: 'customer-1', name: 'Test Customer', email: 'test@example.com' },
      }

      // Mock for profile lookup
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        // Mock for job creation
        .mockResolvedValueOnce({ data: mockJob, error: null })
        // Mock for getById in scheduleReminders (get job with customer)
        .mockResolvedValueOnce({ data: mockJob, error: null })
        // Mock for profile lookup in scheduleReminders
        .mockResolvedValueOnce({ data: mockProfile, error: null })

      mockActivity.created.mockResolvedValue(undefined)

      const result = await JobsService.create(mockInput)

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_job_number', { org_id: 'org-1' })
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          job_number: mockJobNumber,
          customer_id: mockInput.customer_id,
          status: 'scheduled',
          created_by: mockUser.id,
        })
      )
      expect(mockActivity.created).toHaveBeenCalledWith('job', 'job-1', mockJobNumber)
      expect(result).toEqual(mockJob)
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(JobsService.create(mockInput)).rejects.toThrow('Unauthorized')
    })

    it('should throw error when profile is not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      await expect(JobsService.create(mockInput)).rejects.toThrow('Profile not found')
    })

    it('should include proposal_id when provided', async () => {
      const inputWithProposal = { ...mockInput, proposal_id: 'proposal-1' }
      const mockJob = {
        id: 'job-1',
        job_number: mockJobNumber,
        customer: { id: 'customer-1', name: 'Test Customer', email: 'test@example.com' },
      }

      // Mock chain for profile, job creation, getById, and scheduleReminders
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockJob, error: null })
        .mockResolvedValueOnce({ data: mockJob, error: null })
        .mockResolvedValueOnce({ data: mockProfile, error: null })

      mockActivity.created.mockResolvedValue(undefined)

      await JobsService.create(inputWithProposal)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          proposal_id: 'proposal-1',
        })
      )
    })

    it('should default hazard_types to empty array if not provided', async () => {
      const mockJob = {
        id: 'job-1',
        job_number: mockJobNumber,
        customer: { id: 'customer-1', name: 'Test Customer', email: 'test@example.com' },
      }

      // Mock chain for profile, job creation, getById, and scheduleReminders
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockJob, error: null })
        .mockResolvedValueOnce({ data: mockJob, error: null })
        .mockResolvedValueOnce({ data: mockProfile, error: null })

      mockActivity.created.mockResolvedValue(undefined)

      await JobsService.create(mockInput)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          hazard_types: [],
        })
      )
    })

    it('should handle database errors during job creation', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(JobsService.create(mockInput)).rejects.toThrow('Database error')
    })
  })

  describe('getById', () => {
    it('should fetch job with all relations', async () => {
      const mockJob = {
        id: 'job-1',
        job_number: 'JOB-001',
        status: 'scheduled',
        customer: [{ id: 'customer-1', name: 'John Doe' }],
        proposal: [{ id: 'proposal-1', proposal_number: 'PROP-001' }],
        estimate: [{ id: 'estimate-1', estimate_number: 'EST-001' }],
        site_survey: [{ id: 'survey-1' }],
        crew: [],
        equipment: [],
        materials: [],
        disposal: [],
        change_orders: [],
        notes: [],
      }

      mockSupabase.single.mockResolvedValue({ data: mockJob, error: null })

      const result = await JobsService.getById('job-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('customer:customers'))
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'job-1')
      expect(result).toBeDefined()
      expect(result?.customer).toEqual({ id: 'customer-1', name: 'John Doe' })
      expect(result?.proposal).toEqual({ id: 'proposal-1', proposal_number: 'PROP-001' })
    })

    it('should return null when job is not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const result = await JobsService.getById('non-existent')

      expect(result).toBeNull()
    })

    it('should transform nested arrays to single objects', async () => {
      const mockJob = {
        id: 'job-1',
        customer: [{ id: 'customer-1' }],
        proposal: [{ id: 'proposal-1' }],
        estimate: [{ id: 'estimate-1' }],
        site_survey: [{ id: 'survey-1' }],
      }

      mockSupabase.single.mockResolvedValue({ data: mockJob, error: null })

      const result = await JobsService.getById('job-1')

      expect(result?.customer).toEqual({ id: 'customer-1' })
      expect(result?.proposal).toEqual({ id: 'proposal-1' })
      expect(result?.estimate).toEqual({ id: 'estimate-1' })
      expect(result?.site_survey).toEqual({ id: 'survey-1' })
    })
  })

  describe('list', () => {
    const mockJobs = [
      {
        id: 'job-1',
        job_number: 'JOB-001',
        status: 'scheduled',
        customer: [{ id: 'customer-1', name: 'John Doe' }],
        crew: [],
      },
      {
        id: 'job-2',
        job_number: 'JOB-002',
        status: 'in_progress',
        customer: [{ id: 'customer-2', name: 'Jane Smith' }],
        crew: [],
      },
    ]

    it('should list all jobs with default ordering', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockJobs, error: null })

      const result = await JobsService.list()

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockSupabase.order).toHaveBeenCalledWith('scheduled_start_date', { ascending: true })
      expect(result).toHaveLength(2)
      expect(result[0].customer).toEqual({ id: 'customer-1', name: 'John Doe' })
    })

    it('should filter by single status', async () => {
      // Create a mock query chain that tracks eq calls
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockJobs[0]], error: null }),
      }

      mockSupabase.select.mockReturnValue(mockQuery)

      await JobsService.list({ status: 'scheduled' })

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'scheduled')
    })

    it('should filter by multiple statuses', async () => {
      const mockQuery = {
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
      }

      mockSupabase.select.mockReturnValue(mockQuery)

      await JobsService.list({ status: ['scheduled', 'in_progress'] })

      expect(mockQuery.in).toHaveBeenCalledWith('status', ['scheduled', 'in_progress'])
    })

    it('should filter by customer_id', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockJobs[0]], error: null }),
      }

      mockSupabase.select.mockReturnValue(mockQuery)

      await JobsService.list({ customer_id: 'customer-1' })

      expect(mockQuery.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
    })

    it('should filter by date range', async () => {
      const mockQuery = {
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
      }

      mockSupabase.select.mockReturnValue(mockQuery)

      await JobsService.list({ from_date: '2026-02-01', to_date: '2026-02-28' })

      expect(mockQuery.gte).toHaveBeenCalledWith('scheduled_start_date', '2026-02-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('scheduled_start_date', '2026-02-28')
    })

    it('should filter by crew member after query', async () => {
      const jobsWithCrew = [
        {
          ...mockJobs[0],
          crew: [{ profile_id: 'crew-1', is_lead: true }],
        },
        {
          ...mockJobs[1],
          crew: [{ profile_id: 'crew-2', is_lead: false }],
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: jobsWithCrew, error: null })

      const result = await JobsService.list({ crew_member_id: 'crew-1' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('job-1')
    })

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: { message: 'Query failed' } })

      await expect(JobsService.list()).rejects.toThrow('Query failed')
    })
  })

  describe('getCalendarEvents', () => {
    it('should fetch jobs for calendar date range', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          scheduled_start_date: '2026-02-15',
          status: 'scheduled',
          customer: [{ id: 'customer-1' }],
          crew: [],
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockJobs, error: null })

      const result = await JobsService.getCalendarEvents('2026-02-01', '2026-02-28')

      expect(mockSupabase.gte).toHaveBeenCalledWith('scheduled_start_date', '2026-02-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('scheduled_start_date', '2026-02-28')
      expect(mockSupabase.neq).toHaveBeenCalledWith('status', 'cancelled')
      expect(result).toHaveLength(1)
    })

    it('should exclude cancelled jobs from calendar', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      await JobsService.getCalendarEvents('2026-02-01', '2026-02-28')

      expect(mockSupabase.neq).toHaveBeenCalledWith('status', 'cancelled')
    })
  })

  describe('update', () => {
    it('should update job with provided fields', async () => {
      const updates: UpdateJobInput = {
        status: 'in_progress',
        actual_start_at: '2026-02-15T09:00:00Z',
      }

      const mockUpdatedJob = {
        id: 'job-1',
        ...updates,
        updated_at: expect.any(String),
      }

      mockSupabase.single.mockResolvedValue({ data: mockUpdatedJob, error: null })

      const result = await JobsService.update('job-1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'job-1')
      expect(result).toEqual(mockUpdatedJob)
    })

    it('should handle update errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(JobsService.update('job-1', {})).rejects.toThrow('Update failed')
    })
  })

  describe('updateStatus', () => {
    it('should update status to in_progress and set actual_start_at', async () => {
      const mockCurrentJob = {
        id: 'job-1',
        job_number: 'JOB-001',
        status: 'scheduled',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockCurrentJob, error: null })
        .mockResolvedValueOnce({
          data: { ...mockCurrentJob, status: 'in_progress', actual_start_at: expect.any(String) },
          error: null,
        })

      mockActivity.statusChanged.mockResolvedValue(undefined)

      const result = await JobsService.updateStatus('job-1', 'in_progress')

      expect(result.status).toBe('in_progress')
      expect(result.actual_start_at).toBeDefined()
      expect(mockActivity.statusChanged).toHaveBeenCalledWith(
        'job',
        'job-1',
        'JOB-001',
        'scheduled',
        'in_progress'
      )
    })

    it('should update status to completed and set actual_end_at', async () => {
      const mockCurrentJob = {
        id: 'job-1',
        job_number: 'JOB-001',
        status: 'in_progress',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockCurrentJob, error: null })
        .mockResolvedValueOnce({
          data: { ...mockCurrentJob, status: 'completed', actual_end_at: expect.any(String) },
          error: null,
        })

      mockActivity.statusChanged.mockResolvedValue(undefined)

      const result = await JobsService.updateStatus('job-1', 'completed')

      expect(result.status).toBe('completed')
      expect(result.actual_end_at).toBeDefined()
      expect(mockActivity.statusChanged).toHaveBeenCalledWith(
        'job',
        'job-1',
        'JOB-001',
        'in_progress',
        'completed'
      )
    })

    it('should not log activity if status did not change', async () => {
      const mockCurrentJob = {
        id: 'job-1',
        job_number: 'JOB-001',
        status: 'scheduled',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockCurrentJob, error: null })
        .mockResolvedValueOnce({ data: mockCurrentJob, error: null })

      await JobsService.updateStatus('job-1', 'scheduled')

      expect(mockActivity.statusChanged).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete job successfully', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      await JobsService.delete('job-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'job-1')
    })

    it('should handle delete errors', async () => {
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Delete failed' } })

      await expect(JobsService.delete('job-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('cancelReminders', () => {
    it('should cancel pending reminders for job', async () => {
      // The last eq in the chain needs to resolve
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ data: null, error: null })

      await JobsService.cancelReminders('job-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_reminders')
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'cancelled' })
      expect(mockSupabase.eq).toHaveBeenCalledWith('related_type', 'job')
      expect(mockSupabase.eq).toHaveBeenCalledWith('related_id', 'job-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending')
    })
  })
})
