import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LogActivityInput, ActivityLogEntry } from '@/lib/services/activity-service'

// Use vi.hoisted to create mocks before vi.mock is processed
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}))

// Setup chainable mock
const setupChainableMock = () => {
  mockSupabase.from.mockReturnValue(mockSupabase)
  mockSupabase.select.mockReturnValue(mockSupabase)
  mockSupabase.insert.mockReturnValue(mockSupabase)
  mockSupabase.eq.mockReturnValue(mockSupabase)
  mockSupabase.order.mockReturnValue(mockSupabase)
  mockSupabase.limit.mockReturnValue(mockSupabase)
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { logActivity, getRecentActivity, getEntityActivity, Activity } from '@/lib/services/activity-service'

describe('activity-service', () => {
  const mockUser = { id: 'user-1' }
  const mockProfile = { organization_id: 'org-1', full_name: 'John Doe' }

  beforeEach(() => {
    vi.clearAllMocks()
    setupChainableMock()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('logActivity', () => {
    it('should log activity with all fields', async () => {
      const input: LogActivityInput = {
        action: 'updated',
        entity_type: 'job',
        entity_id: 'job-1',
        entity_name: 'JOB-001',
        old_values: { status: 'scheduled' },
        new_values: { status: 'in_progress' },
        description: 'Status changed',
      }

      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await logActivity(input)

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.from).toHaveBeenCalledWith('activity_log')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        organization_id: 'org-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        action: 'updated',
        entity_type: 'job',
        entity_id: 'job-1',
        entity_name: 'JOB-001',
        old_values: { status: 'scheduled' },
        new_values: { status: 'in_progress' },
        description: 'Status changed',
      })
    })

    it('should log activity with minimal fields', async () => {
      const input: LogActivityInput = {
        action: 'created',
        entity_type: 'customer',
        entity_id: 'customer-1',
      }

      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await logActivity(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        organization_id: 'org-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'customer',
        entity_id: 'customer-1',
        entity_name: undefined,
        old_values: undefined,
        new_values: undefined,
        description: undefined,
      })
    })

    it('should return early when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await logActivity({
        action: 'created',
        entity_type: 'job',
        entity_id: 'job-1',
      })

      expect(mockSupabase.from).not.toHaveBeenCalledWith('activity_log')
    })

    it('should return early when profile is not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await logActivity({
        action: 'created',
        entity_type: 'job',
        entity_id: 'job-1',
      })

      expect(mockSupabase.from).not.toHaveBeenCalledWith('activity_log')
    })
  })

  describe('getRecentActivity', () => {
    const mockActivities: ActivityLogEntry[] = [
      {
        id: 'activity-1',
        organization_id: 'org-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'job',
        entity_id: 'job-1',
        entity_name: 'JOB-001',
        old_values: null,
        new_values: null,
        description: null,
        created_at: '2026-02-01T10:00:00Z',
      },
      {
        id: 'activity-2',
        organization_id: 'org-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        action: 'updated',
        entity_type: 'job',
        entity_id: 'job-1',
        entity_name: 'JOB-001',
        old_values: { status: 'scheduled' },
        new_values: { status: 'in_progress' },
        description: 'Status changed',
        created_at: '2026-02-01T11:00:00Z',
      },
    ]

    it('should fetch recent activity with default limit', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockActivities, error: null })

      const result = await getRecentActivity()

      expect(mockSupabase.from).toHaveBeenCalledWith('activity_log')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockSupabase.limit).toHaveBeenCalledWith(20)
      expect(result).toEqual(mockActivities)
    })

    it('should fetch recent activity with custom limit', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockActivities, error: null })

      await getRecentActivity(50)

      expect(mockSupabase.limit).toHaveBeenCalledWith(50)
    })

    it('should return empty array when no data', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: null })

      const result = await getRecentActivity()

      expect(result).toEqual([])
    })
  })

  describe('getEntityActivity', () => {
    const mockActivities: ActivityLogEntry[] = [
      {
        id: 'activity-1',
        organization_id: 'org-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'job',
        entity_id: 'job-1',
        entity_name: 'JOB-001',
        old_values: null,
        new_values: null,
        description: null,
        created_at: '2026-02-01T10:00:00Z',
      },
    ]

    it('should fetch activity for specific entity', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockActivities, error: null })

      const result = await getEntityActivity('job', 'job-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('activity_log')
      expect(mockSupabase.eq).toHaveBeenCalledWith('entity_type', 'job')
      expect(mockSupabase.eq).toHaveBeenCalledWith('entity_id', 'job-1')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockActivities)
    })

    it('should return empty array when no activity found', async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: null })

      const result = await getEntityActivity('job', 'non-existent')

      expect(result).toEqual([])
    })
  })

  describe('Activity.created', () => {
    it('should log created activity with entity name', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.created('job', 'job-1', 'JOB-001')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'created',
          entity_type: 'job',
          entity_id: 'job-1',
          entity_name: 'JOB-001',
        })
      )
    })

    it('should log created activity without entity name', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.created('customer', 'customer-1')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'created',
          entity_type: 'customer',
          entity_id: 'customer-1',
          entity_name: undefined,
        })
      )
    })
  })

  describe('Activity.updated', () => {
    it('should log updated activity with changes', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.updated('job', 'job-1', 'JOB-001', {
        old: { name: 'Old Name' },
        new: { name: 'New Name' },
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'updated',
          entity_type: 'job',
          entity_id: 'job-1',
          entity_name: 'JOB-001',
          old_values: { name: 'Old Name' },
          new_values: { name: 'New Name' },
        })
      )
    })

    it('should log updated activity without changes', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.updated('job', 'job-1')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'updated',
          old_values: undefined,
          new_values: undefined,
        })
      )
    })
  })

  describe('Activity.deleted', () => {
    it('should log deleted activity', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.deleted('job', 'job-1', 'JOB-001')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'deleted',
          entity_type: 'job',
          entity_id: 'job-1',
          entity_name: 'JOB-001',
        })
      )
    })
  })

  describe('Activity.statusChanged', () => {
    it('should log status change with description', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.statusChanged('job', 'job-1', 'JOB-001', 'scheduled', 'in_progress')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'status_changed',
          entity_type: 'job',
          entity_id: 'job-1',
          entity_name: 'JOB-001',
          old_values: { status: 'scheduled' },
          new_values: { status: 'in_progress' },
          description: 'Changed status from scheduled to in_progress',
        })
      )
    })
  })

  describe('Activity.sent', () => {
    it('should log sent activity', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.sent('proposal', 'proposal-1', 'PROP-001')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sent',
          entity_type: 'proposal',
          entity_id: 'proposal-1',
          entity_name: 'PROP-001',
        })
      )
    })
  })

  describe('Activity.signed', () => {
    it('should log signed activity', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.signed('proposal', 'proposal-1', 'PROP-001')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'signed',
          entity_type: 'proposal',
          entity_id: 'proposal-1',
          entity_name: 'PROP-001',
        })
      )
    })
  })

  describe('Activity.paid', () => {
    it('should log paid activity with amount', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.paid('invoice', 'invoice-1', 'INV-001', 5000)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'paid',
          entity_type: 'invoice',
          entity_id: 'invoice-1',
          entity_name: 'INV-001',
          new_values: { amount: 5000 },
        })
      )
    })

    it('should log paid activity without amount', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.paid('invoice', 'invoice-1', 'INV-001')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'paid',
          new_values: undefined,
        })
      )
    })
  })

  describe('Activity.note', () => {
    it('should log note activity', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.note('customer', 'customer-1', 'John Doe', 'Follow up next week')

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'note',
          entity_type: 'customer',
          entity_id: 'customer-1',
          entity_name: 'John Doe',
          description: 'Follow up next week',
        })
      )
    })
  })

  describe('Activity.call', () => {
    it('should log outbound call with all details', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.call('customer', 'customer-1', 'John Doe', {
        direction: 'outbound',
        duration: 300,
        notes: 'Discussed project timeline',
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'call',
          entity_type: 'customer',
          entity_id: 'customer-1',
          entity_name: 'John Doe',
          description: 'Discussed project timeline',
          new_values: {
            direction: 'outbound',
            duration: 300,
          },
        })
      )
    })

    it('should log inbound call without duration', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      await Activity.call('customer', 'customer-1', 'John Doe', {
        direction: 'inbound',
        notes: 'Customer inquiry',
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'call',
          description: 'Customer inquiry',
          new_values: {
            direction: 'inbound',
            duration: undefined,
          },
        })
      )
    })
  })
})
