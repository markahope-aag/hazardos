import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mocks before vi.mock is processed
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
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
  mockSupabase.update.mockReturnValue(mockSupabase)
  mockSupabase.eq.mockReturnValue(mockSupabase)
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

import { ApprovalService } from '@/lib/services/approval-service'

describe('ApprovalService', () => {
  const mockUser = { id: 'user-1' }
  const mockProfile = { organization_id: 'org-1', role: 'admin' }

  beforeEach(() => {
    vi.clearAllMocks()
    setupChainableMock()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  describe('getThresholds', () => {
    it('should fetch all active thresholds', async () => {
      const mockThresholds = [
        {
          id: 'threshold-1',
          organization_id: 'org-1',
          entity_type: 'estimate',
          threshold_amount: 10000,
          approval_level: 1,
          is_active: true,
        },
        {
          id: 'threshold-2',
          organization_id: 'org-1',
          entity_type: 'estimate',
          threshold_amount: 50000,
          approval_level: 2,
          is_active: true,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockThresholds, error: null })

      const result = await ApprovalService.getThresholds()

      expect(mockSupabase.from).toHaveBeenCalledWith('approval_thresholds')
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockSupabase.order).toHaveBeenCalledWith('threshold_amount')
      expect(result).toEqual(mockThresholds)
    })

    it('should filter by entity type when provided', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      await ApprovalService.getThresholds('proposal')

      expect(mockSupabase.eq).toHaveBeenCalledWith('entity_type', 'proposal')
    })

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(ApprovalService.getThresholds()).rejects.toThrow('Query failed')
    })
  })

  describe('createThreshold', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null })
    })

    it('should create a threshold successfully', async () => {
      const input = {
        entity_type: 'estimate' as const,
        threshold_amount: 25000,
        approval_level: 2,
        approver_role: 'manager',
      }

      const mockThreshold = {
        id: 'threshold-1',
        organization_id: 'org-1',
        ...input,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockThreshold, error: null })

      const result = await ApprovalService.createThreshold(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('approval_thresholds')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        organization_id: 'org-1',
        entity_type: 'estimate',
        threshold_amount: 25000,
        approval_level: 2,
        approver_role: 'manager',
      })
      expect(result).toEqual(mockThreshold)
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(
        ApprovalService.createThreshold({
          entity_type: 'estimate',
          threshold_amount: 10000,
          approval_level: 1,
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('should throw error when organization not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      await expect(
        ApprovalService.createThreshold({
          entity_type: 'estimate',
          threshold_amount: 10000,
          approval_level: 1,
        })
      ).rejects.toThrow('Organization not found')
    })

    it('should default approver_role to null if not provided', async () => {
      const input = {
        entity_type: 'estimate' as const,
        threshold_amount: 10000,
        approval_level: 1,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: {}, error: null })

      await ApprovalService.createThreshold(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          approver_role: null,
        })
      )
    })
  })

  describe('updateThreshold', () => {
    it('should update threshold successfully', async () => {
      const updates = {
        threshold_amount: 15000,
        is_active: false,
      }

      const mockUpdatedThreshold = {
        id: 'threshold-1',
        ...updates,
      }

      mockSupabase.single.mockResolvedValue({ data: mockUpdatedThreshold, error: null })

      const result = await ApprovalService.updateThreshold('threshold-1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('approval_thresholds')
      expect(mockSupabase.update).toHaveBeenCalledWith(updates)
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'threshold-1')
      expect(result).toEqual(mockUpdatedThreshold)
    })

    it('should handle update errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(
        ApprovalService.updateThreshold('threshold-1', { is_active: false })
      ).rejects.toThrow('Update failed')
    })
  })

  describe('getRequests', () => {
    const mockRequests = [
      {
        id: 'request-1',
        entity_type: 'estimate',
        entity_id: 'estimate-1',
        amount: 15000,
        final_status: 'pending',
        requester: [{ full_name: 'John Doe' }],
        level1_approver_user: null,
        level2_approver_user: null,
      },
      {
        id: 'request-2',
        entity_type: 'proposal',
        entity_id: 'proposal-1',
        amount: 30000,
        final_status: 'approved',
        requester: [{ full_name: 'Jane Smith' }],
        level1_approver_user: [{ full_name: 'Admin' }],
        level2_approver_user: null,
      },
    ]

    it('should fetch all approval requests', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockRequests, error: null })

      const result = await ApprovalService.getRequests()

      expect(mockSupabase.from).toHaveBeenCalledWith('approval_requests')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(2)
      expect(result[0].requester).toEqual({ full_name: 'John Doe' })
    })

    it('should filter by entity_type', async () => {
      mockSupabase.order.mockResolvedValue({ data: [mockRequests[0]], error: null })

      await ApprovalService.getRequests({ entity_type: 'estimate' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('entity_type', 'estimate')
    })

    it('should filter by status', async () => {
      mockSupabase.order.mockResolvedValue({ data: [mockRequests[1]], error: null })

      await ApprovalService.getRequests({ status: 'approved' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('final_status', 'approved')
    })

    it('should filter by requested_by', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      await ApprovalService.getRequests({ requested_by: 'user-1' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('requested_by', 'user-1')
    })

    it('should filter pending_only', async () => {
      mockSupabase.order.mockResolvedValue({ data: [mockRequests[0]], error: null })

      await ApprovalService.getRequests({ pending_only: true })

      expect(mockSupabase.eq).toHaveBeenCalledWith('final_status', 'pending')
    })

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(ApprovalService.getRequests()).rejects.toThrow('Query failed')
    })
  })

  describe('getRequest', () => {
    it('should fetch approval request by id', async () => {
      const mockRequest = {
        id: 'request-1',
        entity_type: 'estimate',
        final_status: 'pending',
        requester: [{ full_name: 'John Doe' }],
        level1_approver_user: null,
        level2_approver_user: null,
      }

      mockSupabase.single.mockResolvedValue({ data: mockRequest, error: null })

      const result = await ApprovalService.getRequest('request-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('approval_requests')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'request-1')
      expect(result?.requester).toEqual({ full_name: 'John Doe' })
    })

    it('should return null when request not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await ApprovalService.getRequest('non-existent')

      expect(result).toBeNull()
    })

    it('should throw on other errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Database error' },
      })

      await expect(ApprovalService.getRequest('request-1')).rejects.toThrow('Database error')
    })
  })

  describe('createRequest', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null })
      mockActivity.created.mockResolvedValue(undefined)
    })

    it('should create approval request without level 2', async () => {
      const mockThresholds = [
        {
          id: 'threshold-1',
          approval_level: 1,
          threshold_amount: 10000,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockThresholds, error: null })

      const mockRequest = {
        id: 'request-1',
        entity_type: 'estimate',
        entity_id: 'estimate-1',
        amount: 15000,
        requires_level2: false,
        final_status: 'pending',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockRequest, error: null })

      const result = await ApprovalService.createRequest({
        entity_type: 'estimate',
        entity_id: 'estimate-1',
        amount: 15000,
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'estimate',
          entity_id: 'estimate-1',
          amount: 15000,
          requires_level2: false,
          level1_status: 'pending',
          level2_status: null,
          final_status: 'pending',
        })
      )
      expect(mockActivity.created).toHaveBeenCalledWith(
        'approval_request',
        'request-1',
        'estimate approval'
      )
      expect(result).toEqual(mockRequest)
    })

    it('should create approval request with level 2 when threshold requires it', async () => {
      const mockThresholds = [
        {
          id: 'threshold-1',
          approval_level: 1,
          threshold_amount: 10000,
        },
        {
          id: 'threshold-2',
          approval_level: 2,
          threshold_amount: 25000,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockThresholds, error: null })

      const mockRequest = {
        id: 'request-1',
        requires_level2: true,
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockRequest, error: null })

      await ApprovalService.createRequest({
        entity_type: 'estimate',
        entity_id: 'estimate-1',
        amount: 50000,
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          requires_level2: true,
          level2_status: 'pending',
        })
      )
    })

    it('should default amount to 0 if not provided', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      const mockRequest = { id: 'request-1' }
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockRequest, error: null })

      await ApprovalService.createRequest({
        entity_type: 'estimate',
        entity_id: 'estimate-1',
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0,
        })
      )
    })
  })

  describe('decideLevel1', () => {
    const mockRequest = {
      id: 'request-1',
      entity_type: 'estimate',
      entity_id: 'estimate-1',
      requires_level2: false,
      level1_status: 'pending',
      requester: { full_name: 'John Doe' },
    }

    beforeEach(() => {
      mockActivity.statusChanged.mockResolvedValue(undefined)
    })

    it('should approve level 1 and set final status when no level 2 required', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockRequest, error: null })
        .mockResolvedValueOnce({
          data: { ...mockRequest, level1_status: 'approved', final_status: 'approved' },
          error: null,
        })

      const result = await ApprovalService.decideLevel1('request-1', {
        approved: true,
        notes: 'Looks good',
      })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          level1_status: 'approved',
          level1_approver: 'user-1',
          level1_notes: 'Looks good',
          final_status: 'approved',
        })
      )
      expect(mockActivity.statusChanged).toHaveBeenCalledWith(
        'approval_request',
        'request-1',
        'estimate approval',
        'pending',
        'approved'
      )
      expect(result.level1_status).toBe('approved')
    })

    it('should reject level 1 and set final status', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockRequest, error: null })
        .mockResolvedValueOnce({
          data: { ...mockRequest, level1_status: 'rejected', final_status: 'rejected' },
          error: null,
        })

      await ApprovalService.decideLevel1('request-1', {
        approved: false,
        notes: 'Out of budget',
      })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          level1_status: 'rejected',
          final_status: 'rejected',
        })
      )
    })

    it('should keep final status pending when level 2 is required and level 1 approved', async () => {
      const requestWithLevel2 = { ...mockRequest, requires_level2: true }

      mockSupabase.single
        .mockResolvedValueOnce({ data: requestWithLevel2, error: null })
        .mockResolvedValueOnce({
          data: { ...requestWithLevel2, level1_status: 'approved', final_status: 'pending' },
          error: null,
        })

      const result = await ApprovalService.decideLevel1('request-1', { approved: true })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          level1_status: 'approved',
          final_status: 'pending',
        })
      )
      expect(result.final_status).toBe('pending')
    })

    it('should throw when request not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      await expect(
        ApprovalService.decideLevel1('non-existent', { approved: true })
      ).rejects.toThrow('Approval request not found')
    })
  })

  describe('decideLevel2', () => {
    const mockRequest = {
      id: 'request-1',
      entity_type: 'estimate',
      entity_id: 'estimate-1',
      requires_level2: true,
      level1_status: 'approved',
      level2_status: 'pending',
      requester: { full_name: 'John Doe' },
    }

    beforeEach(() => {
      mockActivity.statusChanged.mockResolvedValue(undefined)
    })

    it('should approve level 2 and set final status', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockRequest, error: null })
        .mockResolvedValueOnce({
          data: { ...mockRequest, level2_status: 'approved', final_status: 'approved' },
          error: null,
        })

      const result = await ApprovalService.decideLevel2('request-1', { approved: true })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          level2_status: 'approved',
          level2_approver: 'user-1',
          final_status: 'approved',
        })
      )
      expect(result.level2_status).toBe('approved')
    })

    it('should reject level 2 and set final status', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockRequest, error: null })
        .mockResolvedValueOnce({
          data: { ...mockRequest, level2_status: 'rejected', final_status: 'rejected' },
          error: null,
        })

      await ApprovalService.decideLevel2('request-1', {
        approved: false,
        notes: 'Amount too high',
      })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          level2_status: 'rejected',
          final_status: 'rejected',
        })
      )
    })

    it('should throw when level 1 is not approved', async () => {
      const requestPending = { ...mockRequest, level1_status: 'pending' }
      mockSupabase.single.mockResolvedValue({ data: requestPending, error: null })

      await expect(
        ApprovalService.decideLevel2('request-1', { approved: true })
      ).rejects.toThrow('Level 1 must be approved before level 2')
    })
  })

  describe('getPendingCount', () => {
    it('should return count of pending approvals', async () => {
      mockSupabase.eq.mockResolvedValue({ count: 5, error: null })

      const result = await ApprovalService.getPendingCount()

      expect(mockSupabase.from).toHaveBeenCalledWith('approval_requests')
      expect(mockSupabase.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
      expect(mockSupabase.eq).toHaveBeenCalledWith('final_status', 'pending')
      expect(result).toBe(5)
    })

    it('should return 0 when no pending approvals', async () => {
      mockSupabase.eq.mockResolvedValue({ count: null, error: null })

      const result = await ApprovalService.getPendingCount()

      expect(result).toBe(0)
    })
  })

  describe('checkNeedsApproval', () => {
    it('should return true when amount exceeds threshold', async () => {
      const mockThresholds = [
        {
          threshold_amount: 10000,
          approval_level: 1,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockThresholds, error: null })

      const result = await ApprovalService.checkNeedsApproval('estimate', 15000)

      expect(result).toBe(true)
    })

    it('should return false when amount is below all thresholds', async () => {
      const mockThresholds = [
        {
          threshold_amount: 10000,
          approval_level: 1,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockThresholds, error: null })

      const result = await ApprovalService.checkNeedsApproval('estimate', 5000)

      expect(result).toBe(false)
    })

    it('should return false when no thresholds exist', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      const result = await ApprovalService.checkNeedsApproval('estimate', 100000)

      expect(result).toBe(false)
    })
  })
})
