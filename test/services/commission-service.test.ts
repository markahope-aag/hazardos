import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mocks before vi.mock is processed
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  lt: vi.fn(),
  match: vi.fn(),
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
  mockSupabase.in.mockReturnValue(mockSupabase)
  mockSupabase.gte.mockReturnValue(mockSupabase)
  mockSupabase.lte.mockReturnValue(mockSupabase)
  mockSupabase.lt.mockReturnValue(mockSupabase)
  mockSupabase.match.mockReturnValue(mockSupabase)
  mockSupabase.order.mockReturnValue(mockSupabase)
}

// Mock activity service
const mockActivity = vi.hoisted(() => ({
  created: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/services/activity-service', () => ({
  Activity: mockActivity,
}))

import { CommissionService } from '@/lib/services/commission-service'

describe('CommissionService', () => {
  const mockUser = { id: 'user-1' }
  const mockProfile = { organization_id: 'org-1' }

  beforeEach(() => {
    vi.clearAllMocks()
    setupChainableMock()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  describe('getPlans', () => {
    it('should fetch all active commission plans', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Sales Plan',
          commission_type: 'percentage',
          base_rate: 5,
          is_active: true,
        },
        {
          id: 'plan-2',
          name: 'Premium Plan',
          commission_type: 'tiered',
          is_active: true,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockPlans, error: null })

      const result = await CommissionService.getPlans()

      expect(mockSupabase.from).toHaveBeenCalledWith('commission_plans')
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockSupabase.order).toHaveBeenCalledWith('name')
      expect(result).toEqual(mockPlans)
    })

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(CommissionService.getPlans()).rejects.toThrow('Query failed')
    })
  })

  describe('getPlan', () => {
    it('should fetch plan by id', async () => {
      const mockPlan = {
        id: 'plan-1',
        name: 'Sales Plan',
        commission_type: 'percentage',
        base_rate: 5,
      }

      mockSupabase.single.mockResolvedValue({ data: mockPlan, error: null })

      const result = await CommissionService.getPlan('plan-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('commission_plans')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'plan-1')
      expect(result).toEqual(mockPlan)
    })

    it('should return null when plan not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await CommissionService.getPlan('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createPlan', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null })
      mockActivity.created.mockResolvedValue(undefined)
    })

    it('should create percentage-based commission plan', async () => {
      const input = {
        name: 'Sales Commission',
        commission_type: 'percentage' as const,
        base_rate: 5,
      }

      const mockPlan = {
        id: 'plan-1',
        organization_id: 'org-1',
        ...input,
        applies_to: 'won',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockPlan, error: null })

      const result = await CommissionService.createPlan(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        organization_id: 'org-1',
        name: 'Sales Commission',
        commission_type: 'percentage',
        base_rate: 5,
        tiers: null,
        applies_to: 'won',
      })
      expect(mockActivity.created).toHaveBeenCalledWith(
        'commission_plan',
        'plan-1',
        'Sales Commission'
      )
      expect(result).toEqual(mockPlan)
    })

    it('should create tiered commission plan', async () => {
      const input = {
        name: 'Tiered Plan',
        commission_type: 'tiered' as const,
        tiers: [
          { min: 0, max: 10000, rate: 3 },
          { min: 10001, max: null, rate: 5 },
        ],
      }

      const mockPlan = { id: 'plan-1', ...input }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockPlan, error: null })

      await CommissionService.createPlan(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tiers: input.tiers,
        })
      )
    })

    it('should throw error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(
        CommissionService.createPlan({
          name: 'Test Plan',
          commission_type: 'percentage',
        })
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('updatePlan', () => {
    it('should update commission plan', async () => {
      const updates = {
        base_rate: 7,
        is_active: false,
      }

      const mockPlan = {
        id: 'plan-1',
        ...updates,
        updated_at: expect.any(String),
      }

      mockSupabase.single.mockResolvedValue({ data: mockPlan, error: null })

      const result = await CommissionService.updatePlan('plan-1', updates)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'plan-1')
      expect(result).toEqual(mockPlan)
    })
  })

  describe('deactivatePlan', () => {
    it('should deactivate commission plan', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      await CommissionService.deactivatePlan('plan-1')

      expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: false })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'plan-1')
    })
  })

  describe('getEarnings', () => {
    const mockEarnings = [
      {
        id: 'earning-1',
        user_id: 'user-1',
        commission_amount: 500,
        status: 'pending',
        user: [{ id: 'user-1', full_name: 'John Doe' }],
        plan: [{ id: 'plan-1', name: 'Sales Plan' }],
      },
      {
        id: 'earning-2',
        user_id: 'user-1',
        commission_amount: 750,
        status: 'approved',
        user: [{ id: 'user-1', full_name: 'John Doe' }],
        plan: [{ id: 'plan-1', name: 'Sales Plan' }],
      },
    ]

    it('should fetch all earnings', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockEarnings, error: null })

      const result = await CommissionService.getEarnings()

      expect(mockSupabase.from).toHaveBeenCalledWith('commission_earnings')
      expect(mockSupabase.order).toHaveBeenCalledWith('earning_date', { ascending: false })
      expect(result).toHaveLength(2)
      expect(result[0].user).toEqual({ id: 'user-1', full_name: 'John Doe' })
    })

    it('should filter by user_id', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockEarnings, error: null })

      await CommissionService.getEarnings({ user_id: 'user-1' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('should filter by status', async () => {
      mockSupabase.order.mockResolvedValue({ data: [mockEarnings[0]], error: null })

      await CommissionService.getEarnings({ status: 'pending' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('should filter by pay_period', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      await CommissionService.getEarnings({ pay_period: '2026-02' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('pay_period', '2026-02')
    })

    it('should filter by date range', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockEarnings, error: null })

      await CommissionService.getEarnings({
        start_date: '2026-02-01',
        end_date: '2026-02-28',
      })

      expect(mockSupabase.gte).toHaveBeenCalledWith('earning_date', '2026-02-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('earning_date', '2026-02-28')
    })
  })

  describe('createEarning', () => {
    const mockPlan = {
      id: 'plan-1',
      commission_type: 'percentage',
      base_rate: 5,
    }

    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null })
    })

    it('should create earning with percentage commission', async () => {
      const input = {
        user_id: 'user-1',
        plan_id: 'plan-1',
        job_id: 'job-1',
        base_amount: 10000,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockPlan, error: null })
        .mockResolvedValueOnce({
          data: { id: 'earning-1', commission_amount: 500 },
          error: null,
        })

      const result = await CommissionService.createEarning(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          plan_id: 'plan-1',
          job_id: 'job-1',
          base_amount: 10000,
          commission_rate: 5,
          commission_amount: 500,
          status: 'pending',
        })
      )
      expect(result.commission_amount).toBe(500)
    })

    it('should create earning with flat commission', async () => {
      const flatPlan = {
        id: 'plan-2',
        commission_type: 'flat',
        base_rate: 100,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: flatPlan, error: null })
        .mockResolvedValueOnce({
          data: { id: 'earning-1', commission_amount: 100 },
          error: null,
        })

      await CommissionService.createEarning({
        user_id: 'user-1',
        plan_id: 'plan-2',
        base_amount: 10000,
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          commission_rate: 100,
          commission_amount: 100,
        })
      )
    })

    it('should create earning with tiered commission', async () => {
      const tieredPlan = {
        id: 'plan-3',
        commission_type: 'tiered',
        tiers: [
          { min: 0, max: 10000, rate: 3 },
          { min: 10001, max: null, rate: 5 },
        ],
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: tieredPlan, error: null })
        .mockResolvedValueOnce({
          data: { id: 'earning-1', commission_amount: 750 },
          error: null,
        })

      await CommissionService.createEarning({
        user_id: 'user-1',
        plan_id: 'plan-3',
        base_amount: 15000,
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          commission_rate: 5,
          commission_amount: 750,
        })
      )
    })

    it('should throw when plan not found', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      await expect(
        CommissionService.createEarning({
          user_id: 'user-1',
          plan_id: 'non-existent',
          base_amount: 10000,
        })
      ).rejects.toThrow('Commission plan not found')
    })
  })

  describe('approveEarning', () => {
    it('should approve earning', async () => {
      const mockApprovedEarning = {
        id: 'earning-1',
        status: 'approved',
        approved_by: 'user-1',
        approved_at: expect.any(String),
      }

      mockSupabase.single.mockResolvedValue({ data: mockApprovedEarning, error: null })

      const result = await CommissionService.approveEarning('earning-1')

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'approved',
        approved_by: 'user-1',
        approved_at: expect.any(String),
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'earning-1')
      expect(result.status).toBe('approved')
    })
  })

  describe('markPaid', () => {
    it('should mark earning as paid', async () => {
      const mockPaidEarning = {
        id: 'earning-1',
        status: 'paid',
        paid_at: expect.any(String),
      }

      mockSupabase.single.mockResolvedValue({ data: mockPaidEarning, error: null })

      const result = await CommissionService.markPaid('earning-1')

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'paid',
        paid_at: expect.any(String),
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'earning-1')
      expect(result.status).toBe('paid')
    })
  })

  describe('bulkMarkPaid', () => {
    it('should mark multiple earnings as paid', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      await CommissionService.bulkMarkPaid(['earning-1', 'earning-2', 'earning-3'])

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'paid',
        paid_at: expect.any(String),
      })
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ['earning-1', 'earning-2', 'earning-3'])
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'approved')
    })
  })

  describe('getSummary', () => {
    it('should calculate commission summary for user', async () => {
      const mockPending = [{ commission_amount: 500 }, { commission_amount: 300 }]
      const mockApproved = [{ commission_amount: 1000 }]
      const mockPaid = [{ commission_amount: 2000 }, { commission_amount: 1500 }]
      const mockThisMonth = [{ commission_amount: 800 }]
      const mockThisQuarter = [{ commission_amount: 1200 }]

      mockSupabase.match
        .mockResolvedValueOnce({ data: mockPending, error: null })
        .mockResolvedValueOnce({ data: mockApproved, error: null })
        .mockResolvedValueOnce({ data: mockPaid, error: null })

      mockSupabase.gte
        .mockResolvedValueOnce({ data: mockThisMonth, error: null })
        .mockResolvedValueOnce({ data: mockThisQuarter, error: null })

      const result = await CommissionService.getSummary('user-1')

      expect(result).toEqual({
        total_pending: 800,
        total_approved: 1000,
        total_paid: 3500,
        this_month: 800,
        this_quarter: 1200,
      })
    })

    it('should calculate commission summary for all users when userId not provided', async () => {
      mockSupabase.match
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      mockSupabase.gte
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      const result = await CommissionService.getSummary()

      expect(result).toEqual({
        total_pending: 0,
        total_approved: 0,
        total_paid: 0,
        this_month: 0,
        this_quarter: 0,
      })
    })
  })

  describe('assignPlanToUser', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null })
    })

    it('should assign commission plan to user', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      await CommissionService.assignPlanToUser('user-1', 'plan-1')

      expect(mockSupabase.update).toHaveBeenCalledWith({ commission_plan_id: 'plan-1' })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-1')
    })

    it('should throw when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(
        CommissionService.assignPlanToUser('user-1', 'plan-1')
      ).rejects.toThrow('Unauthorized')
    })
  })
})
